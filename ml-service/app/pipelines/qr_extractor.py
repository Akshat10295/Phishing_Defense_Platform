import cv2
import numpy as np

def extract_qr_url(image_bytes) -> dict:
    """
    High-performance QR URL decoder utilizing OpenCV's native QRCodeDetector.
    Accepts raw image byte stream, extracts embedded URL payloads,
    and returns parsed verdicts.
    """
    try:
        # Decode image from raw buffer bytes
        nparr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return {
                "success": False,
                "error": "Failed to decode uploaded image. Invalid format."
            }

        # Initialize native high-performance OpenCV QR Detector
        detector = cv2.QRCodeDetector()
        
        # Detect and decode QR payload
        val, points, straight_qrcode = detector.detectAndDecode(img)

        # OpenCV detector returns empty string if no QR code is found
        if not val:
            # Try a second sweep with advanced processing: grayscale and thresholding!
            # This handles low-contrast screenshot uploads flawlessly!
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            thresh = cv2.threshold(gray, 127, 255, cv2.THRESH_BINARY)[1]
            val, points, straight_qrcode = detector.detectAndDecode(thresh)

        if val:
            decoded_val = val.strip()
            print(f"[qrExtractor] Successfully decoded QR code URL: {decoded_val}")
            
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
            return {
                "success": True,
                "qr_found": False,
                "payload": None,
                "message": "No active QR code detected in the scanned image."
            }

    except Exception as err:
        print(f"[qrExtractor] Extraction error exception: {err}")
        return {
            "success": False,
            "error": f"Internal image scanning failure: {str(err)}"
        }
