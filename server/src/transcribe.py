import json
import sys

from faster_whisper import WhisperModel


def main() -> None:
    model_name = sys.argv[1] if len(sys.argv) > 1 else "base"
    device = sys.argv[2] if len(sys.argv) > 2 else "cpu"
    compute_type = sys.argv[3] if len(sys.argv) > 3 else "int8"
    model = WhisperModel(model_name, device=device, compute_type=compute_type)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
            audio = req["audio"]
            language = req.get("language") or "pt"
            segments, info = model.transcribe(
                audio,
                language=language,
                vad_filter=True,
                beam_size=1,
            )
            text = "".join(segment.text for segment in segments).strip()
            print(json.dumps({"ok": True, "text": text, "language": info.language}), flush=True)
        except Exception as exc:  # noqa: BLE001
            print(json.dumps({"ok": False, "error": str(exc)}), flush=True)


if __name__ == "__main__":
    main()
