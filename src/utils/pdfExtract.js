import * as pdfjsLib from 'pdfjs-dist'
import Tesseract from 'tesseract.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

export async function extractTextFromPDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise

  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map(item => item.str).join(' ')
    fullText += pageText + '\n'
  }

  return fullText.trim()
}

export async function extractTextWithOCR(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const totalPages = pdf.numPages
  let fullText = ''

  for (let i = 1; i <= totalPages; i++) {
    onProgress?.({
      status: `Scanning page ${i} of ${totalPages}…`,
      progress: (i - 1) / totalPages,
    })

    const page = await pdf.getPage(i)
    // scale 2.5 gives good resolution for OCR without being too slow
    const viewport = page.getViewport({ scale: 2.5 })

    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise

    const result = await Tesseract.recognize(canvas, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text') {
          onProgress?.({
            status: `Reading page ${i} of ${totalPages}…`,
            progress: (i - 1 + m.progress) / totalPages,
          })
        }
      },
    })

    fullText += result.data.text + '\n'
  }

  return fullText.trim()
}
