import * as mammoth from 'mammoth';
import { Question } from '../types';

export const generateId = () => Math.random().toString(36).substring(2, 11);

export const parseTextToQuestions = (text: string): Question[] => {
  const questions: Question[] = [];
  // Phân tách bằng "Câu X:" hoặc "Câu X."
  const blocks = text.split(/(?=Câu\s+\d+\s*[:.])/i);

  for (const block of blocks) {
    if (!block.trim().toLowerCase().startsWith('câu')) continue;

    const lines = block.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    // Tìm và loại bỏ chữ "Câu X: " ở đầu
    let content = lines[0].replace(/Câu\s+\d+\s*[:.]/i, '').trim();
    const options: string[] = [];
    let answerIdx = 0;
    
    let isParsingContent = true;
    let isParsingExplanation = false;
    let explanation = '';
    let level = '';

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const optionMatch = line.match(/^([A-D])[\.\s]+(.*)/i);
      const answerMatch = line.match(/^Đáp án\s*[:.]\s*([A-D])/i);
      const explanationMatch = line.match(/^(?:Lời giải|Giải thích)\s*[:.]\s*(.*)/i);
      const levelMatch = line.match(/^Mức độ\s*[:.]\s*(.*)/i);

      if (levelMatch) {
        isParsingContent = false;
        isParsingExplanation = false;
        level = levelMatch[1].trim();
      } else if (explanationMatch) {
        isParsingContent = false;
        isParsingExplanation = true;
        if (explanationMatch[1]) {
           explanation += explanationMatch[1].trim();
        }
      } else if (answerMatch) {
        isParsingContent = false;
        isParsingExplanation = false;
        const ansChar = answerMatch[1].toUpperCase();
        answerIdx = ansChar.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
      } else if (optionMatch) {
        isParsingContent = false;
        isParsingExplanation = false;
        const optChar = optionMatch[1].toUpperCase();
        const optIndex = optChar.charCodeAt(0) - 65;
        options[optIndex] = optionMatch[2].trim();
      } else if (isParsingExplanation) {
        explanation += (explanation ? '\n' : '') + line;
      } else if (isParsingContent) {
        content += '\n' + line;
      }
    }

    if (options.length >= 2) {
      const q: Question = {
        id: generateId(),
        content: content.trim(),
        options: Array.from({length: 4}, (_, i) => options[i] || `Trống`), // Điền đáp án trống nếu thiếu
        correctAnswer: answerIdx
      };
      if (explanation.trim()) {
         q.explanation = explanation.trim();
      }
      if (level.trim()) {
         q.level = level.trim();
      }
      questions.push(q);
    }
  }
  return questions;
};

export const parseDocx = async (file: File): Promise<Question[]> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return parseTextToQuestions(result.value);
  } catch (error) {
    console.error("Lỗi khi đọc file Word: ", error);
    throw new Error("Không thể trích xuất văn bản từ file này. Vui lòng đảm bảo đúng định dạng .docx");
  }
};
