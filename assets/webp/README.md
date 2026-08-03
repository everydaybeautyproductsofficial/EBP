# assets/webp/ — WebP Images Folder

Yeh EK folder hai jahan poori website ki WebP images rakhni hain.
Andar bilkul wahi folder structure hai jo `assets/images/` mein hai — sirf
file extension `.webp` hai. Isi wajah se path clash nahi hota aur code
automatically sahi WebP file dhoond leta hai.

## Kya karna hai
Har image ko convert karke isi naam se, isi sub-folder mein, `.webp`
extension ke sath yahan daal dein. Filename (extension ke ilawa) bilkul
original jaisa hi rakhein.

Misaal:
| Original (fallback)                          | WebP (yahan daalni hai)                    |
|-----------------------------------------------|---------------------------------------------|
| assets/images/logo.png                        | assets/webp/logo.webp                        |
| assets/images/products/the-ordinary.jpg        | assets/webp/products/the-ordinary.webp        |
| assets/images/blog/skincare-routine.jpg        | assets/webp/blog/skincare-routine.webp        |
| assets/images/web/brands/dior.png              | assets/webp/web/brands/dior.webp              |
| assets/images/web/beauty-advice.jpg            | assets/webp/web/beauty-advice.webp            |

## Note
- `web/og-image.jpg` ka WebP banane ki zaroorat nahi — yeh sirf social-media
  preview (Facebook/Twitter) ke liye meta tag mein use hoti hai, jahan WebP
  support inconsistent hai, isliye ise jaan-boojh kar chhoda gaya hai.
- `favicon.png` aur `assets/icons/*` (apple-touch-icon, icon-192, icon-512)
  bhi WebP mein convert nahi karni — yeh OS/browser icon system ke liye hain
  jo sirf PNG/ICO expect karta hai.
- **`web/brands/*` (brand logos) jaan-boojh kar WebP mein nahi hain.** Yeh
  chhoti, few-color PNG images hain — inke liye lossy WebP encoding, original
  PNG se **chhoti nahi bal-ke barri** ban jati hai (kyunke browser hamesha
  `<source type="image/webp">` ko priority deta hai, size dekhe baghair, is
  se ulta performance kharab hoti). Code mein in logos ke liye ab sirf
  plain `<img>` (PNG) hai, `<picture>` wrapper nahi. Agar kabhi in logos ko
  WebP mein chahiye ho, to `-lossless` mode se convert karna (lossy nahi).
- Code already `<picture>` tag use kar raha hai, is liye agar koi WebP file
  yahan missing ho to browser khud-ba-khud original jpg/png (fallback) load
  kar lega — site kabhi nahi tootegi.
