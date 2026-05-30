import cv2
import numpy as np
import sys

def extract_qr_url(image_bytes) -> dict:
    """
    High-performance QR URL decoder utilizing OpenCV's native QRCodeDetector.
    Accepts raw image byte stream, extracts embedded URL payloads,
    and returns parsed verdicts.
    """
    try:
        # Decode image from raw buffer bytes supporting alpha transparency channel
        nparr = np.frombuffer(image_bytes, np.uint8)
        img_raw = cv2.imdecode(nparr, cv2.IMREAD_UNCHANGED)

        if img_raw is None:
            return {
                "success": False,
                "error": "Failed to decode uploaded image. Invalid format."
            }

        # Handle grayscale vs color vs transparent alpha channel
        if len(img_raw.shape) == 2:
            # Grayscale image
            img = cv2.cvtColor(img_raw, cv2.COLOR_GRAY2BGR)
        elif img_raw.shape[2] == 4:
            # BGRA transparent image: blend with a solid white background to avoid black-on-black
            alpha = img_raw[:, :, 3:4] / 255.0
            white_bg = np.ones_like(img_raw[:, :, :3], dtype=np.uint8) * 255
            img = cv2.convertScaleAbs(img_raw[:, :, :3] * alpha + white_bg * (1.0 - alpha))
        else:
            # Standard BGR image
            img = img_raw

        val = None
        
        # 1. Try decoding using pyzbar (industry standard, highly robust, matches phone camera)
        try:
            from pyzbar.pyzbar import decode as zbar_decode
            decoded_objects = zbar_decode(img)
            if decoded_objects:
                val = decoded_objects[0].data.decode('utf-8')
                print("[qrExtractor] Successfully decoded QR code using pyzbar", file=sys.stderr, flush=True)
        except Exception as zbar_err:
            print(f"[qrExtractor] pyzbar decoding warning: {zbar_err}", file=sys.stderr, flush=True)

        # Initialize native high-performance OpenCV QR Detector as secondary fallback
        detector = cv2.QRCodeDetector()
        
        # 2. Sweep on the raw bordered image (adds white quiet-zone border to assist detection)
        if not val:
            img_bordered = cv2.copyMakeBorder(img, 30, 30, 30, 30, cv2.BORDER_CONSTANT, value=[255, 255, 255])
            val, points, straight_qrcode = detector.detectAndDecode(img_bordered)

        # 3. If not found, try grayscale conversion + quiet zone
        if not val:
            if 'img_bordered' not in locals():
                img_bordered = cv2.copyMakeBorder(img, 30, 30, 30, 30, cv2.BORDER_CONSTANT, value=[255, 255, 255])
            gray = cv2.cvtColor(img_bordered, cv2.COLOR_BGR2GRAY)
            val, points, straight_qrcode = detector.detectAndDecode(gray)

        # 4. If not found, try binarization using Otsu's thresholding
        if not val:
            if 'gray' not in locals():
                if 'img_bordered' not in locals():
                    img_bordered = cv2.copyMakeBorder(img, 30, 30, 30, 30, cv2.BORDER_CONSTANT, value=[255, 255, 255])
                gray = cv2.cvtColor(img_bordered, cv2.COLOR_BGR2GRAY)
            _, thresh_otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            val, points, straight_qrcode = detector.detectAndDecode(thresh_otsu)

        # 5. If not found, try standard binary thresholding
        if not val:
            if 'gray' not in locals():
                if 'img_bordered' not in locals():
                    img_bordered = cv2.copyMakeBorder(img, 30, 30, 30, 30, cv2.BORDER_CONSTANT, value=[255, 255, 255])
                gray = cv2.cvtColor(img_bordered, cv2.COLOR_BGR2GRAY)
            thresh_bin = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)[1]
            val, points, straight_qrcode = detector.detectAndDecode(thresh_bin)

        # 6. If still not found, try scaling up the image to make small QR features clearer
        if not val:
            gray_noborder = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            h, w = gray_noborder.shape
            resized = cv2.resize(gray_noborder, (w * 2, h * 2), interpolation=cv2.INTER_CUBIC)
            resized_bordered = cv2.copyMakeBorder(resized, 30, 30, 30, 30, cv2.BORDER_CONSTANT, value=[255, 255, 255])
            val, points, straight_qrcode = detector.detectAndDecode(resized_bordered)

        if val:
            decoded_val = val.strip()
            print(f"[qrExtractor] Successfully decoded QR code URL: {decoded_val}", file=sys.stderr, flush=True)
            
            # Simple check to confirm the payload is a valid URL
            is_url = decoded_val.lower().startswith(('http://', 'https://', 'www.'))
            
            return {
                "success": True,
                "qr_found": True,
                "payload": decoded_val,
                "is_url": is_url,
                "message": "QR code scanned and decoded successfully."
            }
        else:
            print("[qrExtractor] Failed to detect any QR code in the image after all fallback sweeps.", file=sys.stderr, flush=True)
            return {
                "success": True,
                "qr_found": False,
                "payload": None,
                "message": "No active QR code detected in the scanned image."
            }

    except Exception as err:
        print(f"[qrExtractor] Extraction error exception: {err}", file=sys.stderr, flush=True)
        return {
            "success": False,
            "error": f"Internal image scanning failure: {str(err)}"
        }
