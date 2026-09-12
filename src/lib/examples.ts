import type { Quiz } from './types'

export const exampleQuizzes: Quiz[] = [
  {
    title: 'Amazing Thailand',
    description: 'คำถามสนุก ๆ เกี่ยวกับประเทศไทย',
    status: 'draft', isPublic: false,
    questions: [
      { prompt: 'เมืองหลวงของประเทศไทยคือเมืองใด?', kind: 'single', options: [
        { id: 'bkk', text: 'กรุงเทพมหานคร', isCorrect: true }, { id: 'cm', text: 'เชียงใหม่' },
        { id: 'pk', text: 'ภูเก็ต' }, { id: 'kk', text: 'ขอนแก่น' },
      ], acceptedAnswers: [], explanation: 'กรุงเทพมหานครเป็นเมืองหลวงของประเทศไทยตั้งแต่ พ.ศ. 2325', timeLimit: 20, pointsMode: 'standard', position: 0 },
      { prompt: 'ธงชาติไทยมีทั้งหมดกี่สี?', kind: 'single', options: [
        { id: 'two', text: '2 สี' }, { id: 'three', text: '3 สี', isCorrect: true }, { id: 'four', text: '4 สี' },
      ], acceptedAnswers: [], explanation: 'สีแดง ขาว และน้ำเงิน', timeLimit: 15, pointsMode: 'standard', position: 1 },
      { prompt: 'พิมพ์ชื่อเทศกาลเล่นน้ำของไทย', kind: 'typed', options: [], acceptedAnswers: ['สงกรานต์', 'เทศกาลสงกรานต์'], explanation: 'สงกรานต์เป็นวันขึ้นปีใหม่ไทยตามประเพณี', timeLimit: 30, pointsMode: 'double', position: 2 },
    ],
  },
  {
    title: 'Curious Science', description: 'Fast facts from space, biology, and physics.', status: 'draft', isPublic: false,
    questions: [
      { prompt: 'Which are states of matter?', kind: 'multiple', options: [
        { id: 'solid', text: 'Solid', isCorrect: true }, { id: 'liquid', text: 'Liquid', isCorrect: true },
        { id: 'gas', text: 'Gas', isCorrect: true }, { id: 'sound', text: 'Sound' },
      ], acceptedAnswers: [], explanation: 'Solid, liquid, and gas are the three classical states.', timeLimit: 30, pointsMode: 'standard', position: 0 },
      { prompt: 'Light travels faster than sound.', kind: 'true_false', options: [
        { id: 'true', text: 'True', isCorrect: true }, { id: 'false', text: 'False' },
      ], acceptedAnswers: [], explanation: 'In air, light is vastly faster than sound.', timeLimit: 10, pointsMode: 'standard', position: 1 },
      { prompt: 'Which science topic should we explore next?', kind: 'poll', options: [
        { id: 'space', text: 'Space' }, { id: 'oceans', text: 'Oceans' }, { id: 'robots', text: 'Robots' }, { id: 'body', text: 'Human body' },
      ], acceptedAnswers: [], explanation: 'Every choice counts—this poll is unscored.', timeLimit: 20, pointsMode: 'none', position: 2 },
    ],
  },
]
