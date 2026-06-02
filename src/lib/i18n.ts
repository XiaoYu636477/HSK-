import type { Language } from '@/types/types';

type TranslationKey = string;
type Translations = Record<TranslationKey, Record<Language, string>>;

const translations: Translations = {
  // 通用
  'app.title': { zh: 'HSK智能学习工作台', en: 'HSK AI Workbench', ru: 'HSK Рабочая среда' },
  'app.subtitle': { zh: '智能备考 · 高效通关', en: 'Smart Prep · Pass with Confidence', ru: 'Умная подготовка · Сдайте экзамен' },
  'nav.home': { zh: '首页', en: 'Home', ru: 'Главная' },
  'nav.essay': { zh: '作文批改', en: 'Essay Correction', ru: 'Эссе' },
  'nav.homework': { zh: '作业批改', en: 'Homework', ru: 'Домашнее задание' },
  'nav.oral': { zh: '口语分析', en: 'Oral Analysis', ru: 'Устная речь' },
  'nav.score': { zh: '成绩分析', en: 'Score Analysis', ru: 'Анализ оценок' },
  'nav.tips': { zh: '学习技巧', en: 'Learning Tips', ru: 'Советы' },
  'nav.history': { zh: '历史记录', en: 'History', ru: 'История' },
  'nav.exam':     { zh: '考题解析', en: 'Exam Analysis', ru: 'Анализ заданий' },
  'nav.profile':  { zh: '学习舱', en: 'My Cockpit', ru: 'Учебный кабинет' },
  'nav.login': { zh: '登录', en: 'Login', ru: 'Вход' },
  'nav.logout': { zh: '退出登录', en: 'Logout', ru: 'Выход' },
  'nav.register': { zh: '注册账号', en: 'Register', ru: 'Регистрация' },

  // 登录
  'login.title': { zh: '欢迎回来', en: 'Welcome Back', ru: 'Добро пожаловать' },
  'login.username': { zh: '用户名', en: 'Username', ru: 'Имя пользователя' },
  'login.password': { zh: '密码', en: 'Password', ru: 'Пароль' },
  'login.confirm_password': { zh: '确认密码', en: 'Confirm Password', ru: 'Подтвердите пароль' },
  'login.submit': { zh: '登录', en: 'Login', ru: 'Войти' },
  'login.register_btn': { zh: '注册', en: 'Register', ru: 'Зарегистрироваться' },
  'login.no_account': { zh: '没有账号？', en: "Don't have an account?", ru: 'Нет аккаунта?' },
  'login.has_account': { zh: '已有账号？', en: 'Already have an account?', ru: 'Уже есть аккаунт?' },
  'login.agreement': { zh: '我已阅读并同意用户协议和隐私政策', en: 'I agree to the User Agreement and Privacy Policy', ru: 'Я согласен с Пользовательским соглашением' },

  // 首页
  'home.title': {
    zh: 'HSK智能学习工作台',
    en: 'HSK AI Learning Workbench',
    ru: 'Умная среда для HSK',
  },
  'home.subtitle': {
    zh: 'AI智能批改与备考分析，助你高效通过汉语水平考试',
    en: 'AI-powered correction & exam analysis to help you pass HSK efficiently',
    ru: 'ИИ-проверка и анализ для успешной сдачи HSK',
  },
  'home.cta.start': { zh: '开始智能批改', en: 'Start AI Correction', ru: 'Начать проверку' },
  'home.cta.history': { zh: '我的批改记录', en: 'My Correction History', ru: 'Мои записи' },
  'home.welcome': { zh: '欢迎回来', en: 'Welcome back', ru: 'Добро пожаловать' },
  'home.welcome.guest': {
    zh: '开始你的 HSK 智能备考之旅',
    en: 'Start your smart HSK preparation',
    ru: 'Начните умную подготовку к HSK',
  },
  'home.loop.title': { zh: '智能学习闭环', en: 'Smart Learning Loop', ru: 'Цикл обучения' },
  'home.modules.title': { zh: '全部功能模块', en: 'All Modules', ru: 'Все модули' },

  // 模块描述
  'module.essay.desc': { zh: '粘贴或上传中文作文，获取AI批改和针对性练习', en: 'Paste or upload Chinese essay for AI correction and exercises', ru: 'Загрузите эссе для ИИ-исправления' },
  'module.homework.desc': { zh: '提交课后作业，获取详细批改和练习建议', en: 'Submit homework for detailed correction and practice', ru: 'Отправьте задание для детальной проверки' },
  'module.oral.desc': { zh: '上传口语录音或文字稿，分析发音和流利度', en: 'Upload oral recording or transcript for analysis', ru: 'Загрузите аудио для анализа произношения' },
  'module.score.desc': { zh: '上传成绩数据，查看趋势分析和学习建议', en: 'Upload score data for trend analysis and suggestions', ru: 'Загрузите оценки для анализа трендов' },
  'module.tips.desc': { zh: '基于历史弱项，生成个性化学习计划和练习', en: 'Generate personalized learning plans based on weaknesses', ru: 'Персонализированный план на основе слабых мест' },
  'module.history.desc': { zh: '查看所有批改记录和学习进度', en: 'View all correction records and learning progress', ru: 'Просмотр всех записей и прогресса' },
  'module.exam.desc': { zh: '提交HSK真题，AI生成词汇、考点与完整解析', en: 'Submit HSK questions for AI-powered vocab, points & analysis', ru: 'Отправьте задание — ИИ разберёт слова, темы и ответы' },
  'module.profile.desc': { zh: '学习天数·能力雷达·成长曲线·AI个性化建议，一站全览', en: 'Days studied · ability radar · growth curve · AI suggestions, all in one', ru: 'Дни · радар · рост · ИИ-советы в одном месте' },

  // 输入
  'input.text_placeholder': { zh: '请在此粘贴中文文本...', en: 'Paste Chinese text here...', ru: 'Вставьте китайский текст здесь...' },
  'input.upload_image': { zh: '上传图片', en: 'Upload Image', ru: 'Загрузить изображение' },
  'input.upload_audio': { zh: '上传录音', en: 'Upload Audio', ru: 'Загрузить аудио' },
  'input.submit': { zh: '提交分析', en: 'Submit Analysis', ru: 'Отправить' },

  // 结果
  'result.radar': { zh: '能力雷达图', en: 'Skill Radar', ru: 'Радар навыков' },
  'result.corrections': { zh: '批改对照', en: 'Corrections', ru: 'Исправления' },
  'result.exercises': { zh: '针对性练习', en: 'Exercises', ru: 'Упражнения' },
  'result.original': { zh: '原文', en: 'Original', ru: 'Оригинал' },
  'result.corrected': { zh: '修改建议', en: 'Correction', ru: 'Исправление' },
  'result.explanation': { zh: '说明', en: 'Explanation', ru: 'Объяснение' },
  'result.click_hint': { zh: '点击雷达图维度可筛选对应错误', en: 'Click radar dimensions to filter errors', ru: 'Нажмите на размер для фильтрации' },
  'result.overall': { zh: '总体评价', en: 'Overall Assessment', ru: 'Общая оценка' },
  'result.trend': { zh: '成绩趋势', en: 'Score Trend', ru: 'Тренд оценок' },
  'result.suggestions': { zh: '学习建议', en: 'Suggestions', ru: 'Рекомендации' },

  // 新手引导
  'onboard.step1.title': { zh: 'AI 智能批改', en: 'AI Correction', ru: 'ИИ-проверка' },
  'onboard.step1.desc': { zh: '上传作文、作业或口语文稿，AI 逐句精准批改，雷达图可视化弱项', en: 'Upload essay, homework or transcript. AI corrects every sentence with a radar chart.', ru: 'Загрузите текст, ИИ исправит каждое предложение' },
  'onboard.step2.title': { zh: '诊断分析', en: 'Diagnosis', ru: 'Диагностика' },
  'onboard.step2.desc': { zh: '六维能力雷达图精准定位薄弱环节，点击维度查看对应错误详情', en: '6-dimension radar precisely locates weaknesses. Click to filter matching errors.', ru: 'Радар с 6 измерениями точно находит слабые места' },
  'onboard.step3.title': { zh: '提升练习', en: 'Practice & Improve', ru: 'Практика' },
  'onboard.step3.desc': { zh: '基于批改结果自动生成针对性练习，闭环强化薄弱知识点', en: 'Auto-generated targeted exercises close the learning loop on your weaknesses.', ru: 'Автоматические упражнения для закрытия пробелов' },
  'onboard.skip': { zh: '跳过引导', en: 'Skip Tour', ru: 'Пропустить' },
  'onboard.next': { zh: '下一步', en: 'Next', ru: 'Далее' },
  'onboard.done': { zh: '开始使用', en: 'Get Started', ru: 'Начать' },
  'onboard.progress': { zh: '第 {n} 步，共 3 步', en: 'Step {n} of 3', ru: 'Шаг {n} из 3' },
  // 侧边栏
  'sidebar.quick_correct': { zh: '快速批改', en: 'Quick Correct', ru: 'Быстрая проверка' },
  'sidebar.collapse': { zh: '收起侧边栏', en: 'Collapse Sidebar', ru: 'Свернуть' },
  'sidebar.expand': { zh: '展开侧边栏', en: 'Expand Sidebar', ru: 'Развернуть' },
  // 历史
  'history.empty.title': { zh: '还没有批改记录', en: 'No corrections yet', ru: 'Нет записей' },
  'history.empty.desc': { zh: '完成第一次 AI 批改，开始你的学习之旅！', en: 'Complete your first AI correction to start learning!', ru: 'Выполните первую проверку, чтобы начать обучение!' },
  'history.empty.cta': { zh: '开始批改', en: 'Start Now', ru: 'Начать' },
  'tips.title': { zh: '个性化学习计划', en: 'Personalized Plan', ru: 'Персонализированный план' },
  'tips.no_data': { zh: '暂无学习数据，请先完成批改或分析任务。', en: 'No data yet. Complete some correction tasks first.', ru: 'Пока нет данных. Сначала выполните задания.' },
  'tips.generate': { zh: '生成学习计划', en: 'Generate Plan', ru: 'Создать план' },
  'tips.weak': { zh: '薄弱维度', en: 'Weak Areas', ru: 'Слабые стороны' },
  'tips.daily': { zh: '每日任务', en: 'Daily Tasks', ru: 'Ежедневные задачи' },

  // 历史
  'history.empty': { zh: '暂无历史记录', en: 'No history yet', ru: 'Нет записей' },
  'history.filter.module': { zh: '按模块筛选', en: 'Filter by Module', ru: 'Фильтр' },
  'history.all': { zh: '全部模块', en: 'All Modules', ru: 'Все' },
  'history.view': { zh: '查看详情', en: 'View Details', ru: 'Подробнее' },

  // 语言
  'lang.zh': { zh: '中文', en: '中文', ru: '中文' },
  'lang.en': { zh: 'English', en: 'English', ru: 'English' },
  'lang.ru': { zh: 'Русский', en: 'Русский', ru: 'Русский' },
};

export function t(key: string, lang: Language): string {
  return translations[key]?.[lang] || translations[key]?.['en'] || key;
}