from pathlib import Path
from PIL import Image

project = Path("/home/ubuntu/extracted-product-mobile-app")
source = Path("/home/ubuntu/webdev-static-assets/staarwardd-launcher-icon.png")
targets = [
    project / "assets/images/icon.png",
    project / "assets/images/splash-icon.png",
    project / "assets/images/favicon.png",
    project / "assets/images/android-icon-foreground.png",
]

with Image.open(source) as image:
    image = image.convert("RGBA")
    image.thumbnail((768, 768), Image.Resampling.LANCZOS)
    for target in targets:
        image.save(target, format="PNG", optimize=True, compress_level=9)

for source, target, maximum in [
    (
        project / "assets/images/staarwardd/guardian-toronto.png",
        project / "assets/images/staarwardd/guardian-toronto.png",
        (820, 820),
    ),
    (
        project / "assets/images/staarwardd/summoning-bubble.png",
        project / "assets/images/staarwardd/summoning-bubble.png",
        (900, 900),
    ),
]:
    with Image.open(source) as image:
        image = image.convert("RGB")
        image.thumbnail(maximum, Image.Resampling.LANCZOS)
        image = image.quantize(colors=256, method=Image.Quantize.MEDIANCUT)
        image.save(target, format="PNG", optimize=True, compress_level=9)
