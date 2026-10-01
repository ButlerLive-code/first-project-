import type { PlatformId, PlatformText } from './platforms'

const signInStep = {
  title: 'Войдите в аккаунт',
  text: 'Откройте LaslesVPN и войдите с почтой и паролем, которые вы указали при регистрации.',
}

const connectStep = {
  title: 'Подключитесь',
  text: 'Нажмите большую кнопку «Подключиться». LaslesVPN сам выберет самый быстрый сервер, или выберите локацию из списка.',
}

export const platformText: Record<PlatformId, PlatformText> = {
  windows: {
    requirements: 'Windows 10 или 11, 64-разрядная',
    steps: [
      { title: 'Скачайте установщик', text: 'Нажмите «Скачать для Windows» и сохраните файл LaslesVPN-Setup.exe.' },
      { title: 'Запустите установщик', text: 'Дважды щёлкните по файлу и подтвердите запрос контроля учётных записей (UAC). Установка занимает меньше минуты.' },
      signInStep,
      connectStep,
    ],
    troubleshooting: [
      { problem: 'SmartScreen блокирует установщик', fix: 'Нажмите «Подробнее» → «Выполнить в любом случае». Наш установщик подписан, но новым версиям может понадобиться несколько дней, чтобы набрать репутацию.' },
      { problem: 'Соединение пропадает после спящего режима', fix: 'Откройте «Настройки» → «Подключение» и включите «Переподключаться автоматически».' },
    ],
  },
  macos: {
    requirements: 'macOS 13 Ventura или новее, Intel и Apple silicon',
    steps: [
      { title: 'Скачайте приложение', text: 'Нажмите «Скачать для macOS» и откройте файл LaslesVPN.dmg.' },
      { title: 'Перенесите в «Программы»', text: 'Перетащите значок LaslesVPN в папку «Программы» и запустите приложение.' },
      { title: 'Разрешите конфигурацию VPN', text: 'macOS попросит добавить конфигурацию VPN. Нажмите «Разрешить» и введите пароль от вашего Mac.' },
      signInStep,
      connectStep,
    ],
    troubleshooting: [
      { problem: 'Предупреждение «Не удаётся открыть приложение»', fix: 'Щёлкните по приложению в папке «Программы» правой кнопкой мыши, выберите «Открыть» и подтвердите.' },
      { problem: 'Пропала конфигурация VPN', fix: 'Откройте «Системные настройки» → VPN, удалите LaslesVPN и перезапустите приложение, чтобы добавить конфигурацию заново.' },
    ],
  },
  ios: {
    requirements: 'iOS 16 или новее',
    steps: [
      { title: 'Установите из App Store', text: 'Найдите «LaslesVPN» в App Store и нажмите «Загрузить».' },
      { title: 'Разрешите конфигурации VPN', text: 'При первом запуске нажмите «Разрешить», когда iOS предложит добавить конфигурации VPN, и подтвердите действие через Face ID или код-пароль.' },
      signInStep,
      connectStep,
    ],
    troubleshooting: [
      { problem: 'VPN сам отключается', fix: 'Включите «Подключение по запросу» в настройках LaslesVPN, чтобы iOS поддерживала туннель.' },
    ],
  },
  android: {
    requirements: 'Android 9 или новее',
    steps: [
      { title: 'Установите из Google Play', text: 'Найдите «LaslesVPN» в Google Play и нажмите «Установить».' },
      { title: 'Дайте разрешение на VPN', text: 'При первом подключении Android запросит разрешение на создание VPN-соединения. Нажмите «ОК».' },
      signInStep,
      connectStep,
    ],
    troubleshooting: [
      { problem: 'Режим энергосбережения отключает VPN', fix: 'Настройки → Приложения → LaslesVPN → Батарея → выберите «Без ограничений».' },
    ],
  },
  linux: {
    requirements: 'Ubuntu 22.04 и новее, Debian 12 и новее, Fedora 39 и новее',
    steps: [
      { title: 'Скачайте пакет', text: 'Скачайте пакет .deb (или .rpm для Fedora).' },
      { title: 'Установите', text: 'В папке со скачанным файлом выполните «sudo apt install ./laslesvpn_4.0.3_amd64.deb».' },
      { title: 'Войдите в аккаунт', text: 'Выполните «laslesvpn login» и следуйте подсказкам.' },
      { title: 'Подключитесь', text: 'Выполните «laslesvpn connect» для самого быстрого сервера или «laslesvpn connect de» для сервера в конкретной стране.' },
    ],
    troubleshooting: [
      { problem: 'После установки команда не найдена', fix: 'Откройте новый сеанс терминала или выполните «hash -r», чтобы оболочка увидела новый исполняемый файл.' },
    ],
  },
}
