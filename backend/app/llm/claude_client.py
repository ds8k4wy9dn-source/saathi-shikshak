"""Anthropic Claude async client with retry and fallback."""
import asyncio
import json
import re

from anthropic import APIError, APIStatusError, AsyncAnthropic, RateLimitError

from app.core.config import settings

_client: AsyncAnthropic | None = None


def get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        _client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    return _client


async def get_structured_advice(
    system_prompt: str,
    max_tokens: int = 1200,
    temperature: float = 0.3,
    retries: int = 1,
) -> dict:
    """
    Call Claude Sonnet 4.6 and return the parsed JSON response dict.
    Retries once on transient errors. Raises on all failures so the caller
    (query.py) can fall back to the Hindi/English fallback response.
    """
    client = get_client()

    for attempt in range(retries + 1):
        try:
            response = await client.messages.create(
                model="claude-sonnet-4-6",
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=[{
                    "role": "user",
                    "content": "Please provide advice following the JSON structure exactly.",
                }],
            )

            # Scan all content blocks for the first one with text.
            # Avoids assuming content[0] is always a TextBlock — Claude can
            # return ThinkingBlock or ToolUseBlock, neither of which has .text.
            raw_text: str | None = None
            for block in response.content:
                candidate = getattr(block, "text", None)
                if candidate is not None:
                    raw_text = candidate
                    break

            if raw_text is None:
                raise ValueError("Claude response contained no text content block")

            raw_text = raw_text.strip()

            # Strip any accidental markdown code fences Claude might add
            raw_text = re.sub(r'^```(?:json)?\s*', '', raw_text, flags=re.MULTILINE)
            raw_text = re.sub(r'\s*```$', '', raw_text, flags=re.MULTILINE)
            raw_text = raw_text.strip()

            return json.loads(raw_text)

        except (json.JSONDecodeError, KeyError, ValueError) as e:
            if attempt < retries:
                continue
            raise ValueError(f"Claude returned malformed JSON: {e}") from e

        except RateLimitError:
            if attempt < retries:
                await asyncio.sleep(2)  # Non-blocking — must be asyncio.sleep, not time.sleep
                continue
            raise

        except (APIError, APIStatusError):
            if attempt < retries:
                await asyncio.sleep(1)  # Non-blocking — must be asyncio.sleep, not time.sleep
                continue
            raise

    raise RuntimeError("All Claude API retry attempts exhausted")