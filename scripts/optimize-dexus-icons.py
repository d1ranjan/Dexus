from pathlib import Path

from PIL import Image


PROJECT = Path(__file__).resolve().parents[1]
SOURCE = Path("/home/ubuntu/webdev-static-assets/dexus-mobile-icon-optimized.png")
TARGETS = {
    "icon.png": 512,
    "splash-icon.png": 512,
    "favicon.png": 96,
    "android-icon-foreground.png": 432,
}
LIMIT = 1024 * 1024


def export_icon(source: Image.Image, destination: Path, size: int) -> int:
    canvas = source.convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)
    canvas.save(destination, "PNG", optimize=True, compress_level=9)
    return destination.stat().st_size


def main() -> None:
    if not SOURCE.exists():
        raise FileNotFoundError(f"Canonical managed Dexus icon source is unavailable: {SOURCE}")
    with Image.open(SOURCE) as image:
        if image.width != image.height:
            raise ValueError("Dexus icon source must be square.")
        output = {}
        for filename, size in TARGETS.items():
            target = PROJECT / "assets" / "images" / filename
            output[filename] = export_icon(image, target, size)
    oversized = [name for name, bytes_used in output.items() if bytes_used >= LIMIT]
    if oversized:
        raise ValueError(f"Optimized Dexus icon assets exceed the checkpoint media limit: {', '.join(oversized)}")
    for name, bytes_used in output.items():
        print(f"{name}: {bytes_used} bytes")


if __name__ == "__main__":
    main()
