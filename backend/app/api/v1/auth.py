"""POST /api/v1/auth/verify — Firebase Phone OTP verification."""
import uuid
import os
import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.db_models import Teacher
from app.models.request import AuthVerifyRequest
from app.models.response import TeacherProfile

router = APIRouter()


# async def _verify_firebase_token(id_token: str, project_id: str) -> dict:
#     """Verify Firebase ID token and return decoded claims."""
#     try:
#         import firebase_admin
#         from firebase_admin import auth as fb_auth

#         # THE NUCLEAR OVERRIDE: 
#         # Bypass JSON credentials entirely. Initialize strictly using the Project ID.
#         if not firebase_admin._apps:
#             firebase_admin.initialize_app(options={
#                 'projectId': project_id
#             })

#         return fb_auth.verify_id_token(id_token)
#     except Exception as e:
#         # UNMASK THE ERROR: Print it explicitly to the HuggingFace logs!
#         print(f"🔥 FIREBASE AUTH CRASH: {str(e)}")
#         raise HTTPException(
#             status_code=status.HTTP_401_UNAUTHORIZED,
#             detail=f"Invalid Firebase token: {e}",
#         )

async def _verify_firebase_token(id_token: str, project_id: str) -> dict:
    """Verify Firebase ID token using a safely parsed Service Account JSON."""
    try:
        import firebase_admin
        from firebase_admin import auth as fb_auth
        from firebase_admin import credentials

        if not firebase_admin._apps:
            # 1. Pull the raw JSON string from HuggingFace Secrets
            secret_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
            
            if not secret_json:
                raise ValueError("FIREBASE_SERVICE_ACCOUNT secret is missing in HuggingFace")

            # 2. Parse the string into a Python dictionary safely
            cert_dict = json.loads(secret_json)
            
            # 3. Initialize Firebase with the dictionary
            cred = credentials.Certificate(cert_dict)
            firebase_admin.initialize_app(cred)

        return fb_auth.verify_id_token(id_token)
    
    except Exception as e:
        print(f"🔥 FIREBASE AUTH CRASH: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid Firebase token or server config: {e}",
        )


@router.post("/auth/verify", response_model=TeacherProfile)
async def verify_auth(
    request: AuthVerifyRequest,
    db: AsyncSession = Depends(get_db),
) -> TeacherProfile:
    """
    Verify Firebase Phone OTP token.
    Creates a new Teacher record on first login; returns existing on subsequent logins.
    """
    from app.core.config import settings

    decoded = await _verify_firebase_token(request.id_token, settings.firebase_project_id)
    phone: str = decoded.get("phone_number", "")

    if not phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Firebase token contains no phone_number claim",
        )

    # Check for existing teacher
    result = await db.execute(select(Teacher).where(Teacher.phone == phone))
    teacher = result.scalar_one_or_none()
    is_new = teacher is None

    if is_new:
        teacher = Teacher(
            id=uuid.uuid4(),
            phone=phone,
            language_pref=request.language_pref,
        )
        db.add(teacher)
        # Explicit commit — get_db() no longer auto-commits.
        # If this fails, we return 500 rather than silently returning a profile
        # for a teacher row that was never actually persisted.
        try:
            await db.commit()
            await db.refresh(teacher)  # Load server-generated defaults (created_at, etc.)
        except Exception as e:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create teacher profile: {e}",
            )

    return TeacherProfile(
        teacher_id=str(teacher.id),
        phone=teacher.phone,
        name=teacher.name,
        language_pref=teacher.language_pref,
        grades_taught=teacher.grades_taught,
        subjects_taught=teacher.subjects_taught,
        is_new_user=is_new,
    )