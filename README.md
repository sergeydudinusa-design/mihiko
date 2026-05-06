# Михико — Лендинг с Decap CMS

Статический лендинг с визуальной CMS-панелью и полной SEO-оптимизацией.

---

## Структура проекта

```
mihiko-cms/
├── admin/
│   ├── index.html        ← Панель управления CMS
│   └── config.yml        ← Настройки полей CMS
├── content/
│   ├── settings.json     ← SEO, брендинг, контакты, тексты
│   ├── menu/             ← Позиции меню (по одному JSON на блюдо)
│   ├── sets/             ← Сеты
│   ├── locations/        ← Города
│   └── faq/              ← Вопросы-ответы
├── public/               ← Генерируется автоматически (не редактировать)
├── build.js              ← Скрипт сборки
├── netlify.toml          ← Конфигурация Netlify
└── package.json
```

---

## Установка на Netlify (пошагово)

### Шаг 1 — GitHub

1. Зарегистрируйтесь на [github.com](https://github.com)
2. Создайте новый репозиторий (например `mihiko-landing`)
3. Загрузите все файлы из этой папки в репозиторий

Через командную строку:
```bash
cd mihiko-cms
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/ВАШ_НИК/mihiko-landing.git
git push -u origin main
```

### Шаг 2 — Netlify

1. Зайдите на [netlify.com](https://netlify.com) → **Sign up** (можно через GitHub)
2. Нажмите **Add new site** → **Import an existing project**
3. Выберите **GitHub** → найдите репозиторий `mihiko-landing`
4. Настройки сборки заполнятся автоматически из `netlify.toml`:
   - Build command: `node build.js`
   - Publish directory: `public`
5. Нажмите **Deploy site**

Через 1-2 минуты сайт будет доступен по адресу типа `mihiko.netlify.app`.

### Шаг 3 — Включить Identity (для входа в CMS)

1. В панели Netlify → **Integrations** → **Identity** → **Enable Identity**
2. Перейдите в **Identity** → **Invite users** → введите свой email
3. Проверьте почту — придёт письмо со ссылкой для установки пароля
4. Также в **Identity** → **Services** → **Git Gateway** → **Enable Git Gateway**

### Шаг 4 — Привязать домен mihiko.ru

1. В Netlify → **Domain management** → **Add custom domain**
2. Введите `mihiko.ru`
3. Перейдите к вашему регистратору домена и создайте DNS-запись:
   - Тип: `CNAME`
   - Имя: `www`
   - Значение: `mihiko.netlify.app`
   - Также для корневого домена: `A` запись → IP Netlify (они дадут)
4. HTTPS включится автоматически через Let's Encrypt

---

## Как пользоваться CMS

### Войти в панель управления

Откройте: `https://mihiko.ru/admin/`

Введите email и пароль → попадёте в панель Decap CMS.

### Что можно редактировать

**⚙️ Настройки сайта**
- SEO: title, description, OG-теги — всё для поисковиков
- Брендинг: акцентный цвет, название, логотип
- Контакты: телефон, email, часы
- Hero-секция: бейдж, заголовок, подзаголовок, статистика
- Блок скачивания: заголовок, ссылки на App Store / Google Play
- Подвал: описание, copyright
- Бегущая строка

**🍣 Меню**
- Добавить блюдо: кнопка **New** в разделе Меню
- Поля: название, состав, цена, вес, категория, тег, эмодзи, фото
- Скрыть блюдо: снять галочку «Доступно» (не удаляя)
- Порядок: поле «Порядок сортировки» (1 = первый)

**🎁 Сеты** — аналогично меню

**📍 Локации** — добавить новый город

**❓ FAQ** — добавить вопрос-ответ

### Как изменения попадают на сайт

После нажатия **Publish** в CMS:
1. Decap CMS записывает JSON в GitHub
2. Netlify автоматически запускает `node build.js`
3. Через ~60 секунд сайт обновляется

---

## Добавить позицию в меню вручную (без CMS)

Создайте файл `content/menu/17-novyj-roll.json`:

```json
{
  "id": 17,
  "name": "Радуга",
  "sub": "лосось · тунец · авокадо · икра",
  "price": 850,
  "weight": "260 г",
  "tag": "Новинка",
  "cat": "Авторские",
  "emoji": "🌈",
  "available": true,
  "sort": 17
}
```

Допустимые значения `tag`: `"Хит"`, `"Новинка"`, `"Острый"`, `"Веган"`, или `null`  
Допустимые значения `cat`: `"Классика"`, `"Авторские"`, `"Запечённые"`, `"Острые"`, `"Веганские"`

---

## Локальный запуск (для разработчика)

```bash
npm run build    # собрать сайт → public/index.html
npm run dev      # собрать + запустить на localhost:3000
```

Требуется Node.js 16+.
