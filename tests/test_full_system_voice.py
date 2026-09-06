#!/usr/bin/env python3
"""
Production-Level Full System In-Memory HTTP Integration Test for NEMI Voice Server
Tests full HTTP request parsing, TTS audio generation, voice selection, and STT endpoint
without requiring OS network socket permissions.
"""

import io
import unittest
import json

import voice_server


class MockHttpSocket:
    """Simulates a TCP client socket for BaseHTTPRequestHandler."""
    def __init__(self, request_bytes: bytes):
        self._rfile = io.BytesIO(request_bytes)
        self._wfile = io.BytesIO()

    def makefile(self, mode, *args, **kwargs):
        if 'r' in mode:
            return self._rfile
        return self._wfile

    def sendall(self, data):
        self._wfile.write(data)

    def close(self):
        pass

    def get_response_bytes(self) -> bytes:
        return self._wfile.getvalue()


class MockServer:
    def __init__(self):
        self.server_name = '127.0.0.1'
        self.server_port = 5002


def execute_voice_http(method: str, path: str, body: bytes = b'', content_type: str = 'application/json') -> tuple[int, bytes, dict]:
    headers = [
        f"{method} {path} HTTP/1.1",
        "Host: 127.0.0.1:5002",
        f"Content-Type: {content_type}",
        f"Content-Length: {len(body)}",
        "",
        ""
    ]
    raw_request = "\r\n".join(headers).encode('utf-8') + body
    sock = MockHttpSocket(raw_request)
    server = MockServer()

    voice_server.VoiceHandler(sock, ('127.0.0.1', 54322), server)

    raw_response = sock.get_response_bytes()
    header_part, _, body_part = raw_response.partition(b'\r\n\r\n')
    status_line = header_part.split(b'\r\n')[0].decode('utf-8', errors='ignore')
    status_code = int(status_line.split(' ')[1]) if len(status_line.split(' ')) > 1 else 500

    parsed_json = {}
    try:
        parsed_json = json.loads(body_part.decode('utf-8'))
    except Exception:
        pass

    return status_code, body_part, parsed_json


class TestFullSystemVoiceServer(unittest.TestCase):

    def test_http_voice_health_contract(self):
        status, _, data = execute_voice_http('GET', '/health')
        self.assertEqual(status, 200)
        self.assertEqual(data.get('status'), 'ok')
        self.assertIn('voice', data)
        self.assertIn('kokoro', data)
        self.assertIn('stt', data)

    def test_http_set_voice_endpoint(self):
        payload = json.dumps({'voice': 'af_bella'}).encode('utf-8')
        status, _, data = execute_voice_http('POST', '/set-voice', payload)
        self.assertEqual(status, 200)
        self.assertEqual(data.get('voice'), 'af_bella')

    def test_http_tts_synthesis_payload(self):
        payload = json.dumps({
            'text': 'NEMI is online and ready.',
            'voice': 'af_heart',
        }).encode('utf-8')
        status, raw_audio, _ = execute_voice_http('POST', '/tts', payload)
        self.assertEqual(status, 200)
        self.assertGreater(len(raw_audio), 0)
        if raw_audio.startswith(b'RIFF'):
            self.assertEqual(raw_audio[8:12], b'WAVE')

    def test_http_transcribe_empty_body_rejection(self):
        status, _, _ = execute_voice_http('POST', '/transcribe', b'', content_type='audio/wav')
        self.assertEqual(status, 400)

    def test_http_transcribe_with_audio_bytes(self):
        wav = voice_server.text_to_wav_bytes("Testing voice assistant.")
        self.assertGreater(len(wav), 1000)
        status, _, data = execute_voice_http('POST', '/transcribe', wav, content_type='audio/wav')
        self.assertEqual(status, 200)
        self.assertIn('text', data)
        self.assertIn('mode', data)


if __name__ == '__main__':
    unittest.main()
