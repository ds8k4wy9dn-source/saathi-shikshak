import { useCallback, useEffect, useRef, useState } from 'react'

interface SpeechRecognitionOptions {
  lang?: string
  onResult: (transcript: string) => void
  onError?: (error: string) => void
}

interface UseSpeechRecognitionReturn {
  isListening: boolean
  isSupported: boolean
  transcript: string
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
}

export function useSpeechRecognition({
  lang = 'hi-IN',
  onResult,
  onError,
}: SpeechRecognitionOptions): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  // Detect Web Speech API support (types declared in src/types/speech-recognition.d.ts)
  const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition
  const isSupported = Boolean(SpeechRecognitionAPI)

  // Initialize recognition engine once
  useEffect(() => {
    if (!isSupported || !SpeechRecognitionAPI) return

    const recognition = new SpeechRecognitionAPI()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.lang = lang

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = event.results[0]?.[0]?.transcript?.trim() ?? ''
      if (text) {
        setTranscript(text)
        onResult(text)
      }
      setIsListening(false)
    }

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false)
      const errorMessages: Record<string, string> = {
        'no-speech':           'voice_no_speech',
        'not-allowed':         'voice_denied',
        'audio-capture':       'voice_denied',
        'network':             'network',
        'aborted':             '',
        'service-not-allowed': 'voice_unsupported',
      }
      const errorKey = errorMessages[event.error] ?? 'generic'
      if (errorKey && onError) {
        onError(errorKey)
      }
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [isSupported, lang]) // eslint-disable-line react-hooks/exhaustive-deps

  const startListening = useCallback(() => {
    if (!isSupported) {
      onError?.('voice_unsupported')
      return
    }
    if (isListening) return
    setTranscript('')
    try {
      recognitionRef.current?.start()
      setIsListening(true)
    } catch {
      // Already started — ignore
    }
  }, [isSupported, isListening, onError])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setIsListening(false)
  }, [])

  const resetTranscript = useCallback(() => setTranscript(''), [])

  return { isListening, isSupported, transcript, startListening, stopListening, resetTranscript }
}