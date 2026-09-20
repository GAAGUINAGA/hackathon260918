# ADR-005: OCR con Tesseract + PaddleOCR

## Contexto
Los documentos de entrada incluyen escaneos e imágenes de calidad variable, en
español e inglés, con layouts diversos.

## Decisión
Tesseract (pytesseract) como motor primario, PaddleOCR como fallback cuando la
calidad de Tesseract es insuficiente.

## Consecuencias
Cobertura amplia de idiomas y tipos de layout sin depender de un único motor.
Costo de mantener dos integraciones (`OCRPort` las abstrae).
