import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

type Language = 'en' | 'th'
type Dictionary = Record<string, string>

const dictionaries: Record<Language, Dictionary> = {
  en: {
    product: 'Toohak — Red Group', join: 'Join game', pin: 'Game PIN', nickname: 'Nickname', continue: 'Continue',
    host: 'Host', dashboard: 'Dashboard', logout: 'Log out', login: 'Log in', signup: 'Create account',
    quizzes: 'My quizzes', sessions: 'Game history', assignments: 'Assignments', createQuiz: 'Create quiz',
    players: 'Players', start: 'Start game', answer: 'Submit answer', submitted: 'Answer locked in!',
    waiting: 'Waiting for the host…', leaderboard: 'Leaderboard', final: 'Final results', language: 'ภาษาไทย',
  },
  th: {
    product: 'Toohak — กลุ่มสีแดง', join: 'เข้าร่วมเกม', pin: 'รหัสเกม', nickname: 'ชื่อเล่น', continue: 'ดำเนินการต่อ',
    host: 'ผู้ดำเนินเกม', dashboard: 'แดชบอร์ด', logout: 'ออกจากระบบ', login: 'เข้าสู่ระบบ', signup: 'สร้างบัญชี',
    quizzes: 'แบบทดสอบของฉัน', sessions: 'ประวัติเกม', assignments: 'งานที่มอบหมาย', createQuiz: 'สร้างแบบทดสอบ',
    players: 'ผู้เล่น', start: 'เริ่มเกม', answer: 'ส่งคำตอบ', submitted: 'บันทึกคำตอบแล้ว!',
    waiting: 'กำลังรอผู้ดำเนินเกม…', leaderboard: 'ตารางคะแนน', final: 'ผลลัพธ์สุดท้าย', language: 'English',
  },
}

interface I18nValue { language: Language; setLanguage: (language: Language) => void; t: (key: string) => string }
const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => (localStorage.getItem('toohak-language') as Language) || 'en')
  const value = useMemo<I18nValue>(() => ({
    language,
    setLanguage(next) { localStorage.setItem('toohak-language', next); setLanguageState(next) },
    t: (key) => dictionaries[language][key] ?? key,
  }), [language])
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside I18nProvider')
  return value
}
