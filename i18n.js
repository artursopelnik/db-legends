/*
 * Uebersetzungen. Englisch ist die Standardsprache; die Sprache wird aus
 * navigator.languages ermittelt und kann manuell umgeschaltet werden
 * (Auswahl wird in localStorage gespeichert).
 */

const I18N = {
  en: {
    subtitle: 'Free tool: save any number of friend codes and generate working QR codes for the Anniversary event – scan them in-game and summon Shenron or Porunga. Everything runs locally; your list stays on your device.',
    addHeading: 'Add friend code',
    codePlaceholder: 'Friend code (e.g. umd74s5q8)',
    addBtn: 'Add',
    errInvalid: 'The friend code must be 8–10 characters long and contain only letters and numbers.',
    errDuplicate: 'This friend code is already in your list.',
    refreshAll: '🔄 Regenerate',
    allImages: '🖼️ All images',
    export: 'Export',
    import: 'Import',
    freshHint: 'Tip: tap “Regenerate” right before scanning in-game – the game likes fresh codes.',
    emptyTitle: 'Gather your warriors!',
    emptyText: 'No friend codes saved yet. Add your first code above.',
    installHint: '📲 Tip: use your browser menu “Add to Home Screen” to turn this into an app – your list is saved and all QR codes are fresh every time you open it.',
    footer: 'Unofficial fan tool – not affiliated with Bandai Namco. QR format compatible with the Dragon Ball Legends friend scanner.',
    btnNew: '🔄 New',
    btnImage: '🖼️ Image',
    btnCopy: '📋 Code',
    ageSec: 'generated {s} s ago',
    ageMin: 'generated {m} min ago',
    ageStale: ' – regenerate!',
    toastRefreshed: 'All QR codes regenerated!',
    toastAuto: 'QR codes refreshed automatically',
    toastCopied: 'Friend code copied!',
    toastPng: 'PNG downloaded',
    toastPngs: '{n} PNG(s) downloaded',
    toastImported: '{n} code(s) imported',
    importError: 'Couldn’t read the file (expected: a JSON export from this app).',
    deleteConfirm: 'Delete friend code “{code}”?',
    modalHint: 'Long-press to save the image to your gallery – tap anywhere to close',
    holderTitle: 'Tap for fullscreen – long-press to save the image',
    qrAlt: 'QR code for {code}',
  },
  de: {
    subtitle: 'Kostenloses Tool: Speichere beliebig viele Freundescodes und erzeuge alle QR-Codes gleichzeitig – direkt im Spiel einscannen und Shenron oder Porunga beschwören. Alles läuft lokal, deine Liste bleibt gespeichert.',
    addHeading: 'Freundescode hinzufügen',
    codePlaceholder: 'Freundescode (z. B. umd74s5q8)',
    addBtn: 'Hinzufügen',
    errInvalid: 'Der Freundescode muss 8–10 Zeichen lang sein und darf nur Buchstaben und Zahlen enthalten.',
    errDuplicate: 'Dieser Freundescode ist bereits in deiner Liste.',
    refreshAll: '🔄 Neu generieren',
    allImages: '🖼️ Alle Bilder',
    export: 'Export',
    import: 'Import',
    freshHint: 'Tipp: Vor dem Scannen im Spiel kurz „Neu generieren“ drücken – das Spiel mag frische Codes.',
    emptyTitle: 'Sammle deine Krieger!',
    emptyText: 'Noch keine Freundescodes gespeichert. Füge oben deinen ersten Code hinzu.',
    installHint: '📲 Tipp: Über das Browser-Menü „Zum Startbildschirm hinzufügen“ wird daraus eine App – deine Liste bleibt gespeichert und beim Öffnen sind alle QR-Codes automatisch frisch.',
    footer: 'Inoffizielles Fan-Tool – nicht mit Bandai Namco verbunden. QR-Format kompatibel mit dem Dragon Ball Legends Freundes-Scanner.',
    btnNew: '🔄 Neu',
    btnImage: '🖼️ Bild',
    btnCopy: '📋 Code',
    ageSec: 'generiert vor {s} s',
    ageMin: 'generiert vor {m} min',
    ageStale: ' – neu generieren!',
    toastRefreshed: 'Alle QR-Codes neu generiert!',
    toastAuto: 'QR-Codes automatisch aktualisiert',
    toastCopied: 'Freundescode kopiert!',
    toastPng: 'PNG heruntergeladen',
    toastPngs: '{n} PNG(s) heruntergeladen',
    toastImported: '{n} Code(s) importiert',
    importError: 'Die Datei konnte nicht gelesen werden (erwartet: JSON-Export dieser App).',
    deleteConfirm: 'Freundescode „{code}“ wirklich löschen?',
    modalHint: 'Lange drücken, um das Bild in der Galerie zu speichern – zum Schließen tippen',
    holderTitle: 'Tippen für Vollbild – lange drücken, um das Bild zu speichern',
    qrAlt: 'QR-Code für {code}',
  },
  es: {
    subtitle: 'Guarda todos los friend codes que quieras y genera todos los códigos QR a la vez, siempre frescos y listos para escanear en el juego. Todo funciona en local; tu lista se queda en tu dispositivo.',
    addHeading: 'Añadir friend code',
    codePlaceholder: 'Friend code (p. ej. umd74s5q8)',
    addBtn: 'Añadir',
    errInvalid: 'El friend code debe tener entre 8 y 10 caracteres y solo puede contener letras y números.',
    errDuplicate: 'Este friend code ya está en tu lista.',
    refreshAll: '🔄 Regenerar',
    allImages: '🖼️ Todas las imágenes',
    export: 'Exportar',
    import: 'Importar',
    freshHint: 'Consejo: pulsa «Regenerar» justo antes de escanear en el juego; al juego le gustan los códigos recientes.',
    emptyTitle: '¡Reúne a tus guerreros!',
    emptyText: 'Aún no hay friend codes guardados. Añade tu primer código arriba.',
    installHint: '📲 Consejo: usa «Añadir a pantalla de inicio» en el menú del navegador para convertir esto en una app: tu lista se guarda y los códigos QR se renuevan cada vez que la abres.',
    footer: 'Herramienta de fans no oficial, sin relación con Bandai Namco. Formato QR compatible con el escáner de amigos de Dragon Ball Legends.',
    btnNew: '🔄 Nuevo',
    btnImage: '🖼️ Imagen',
    btnCopy: '📋 Código',
    ageSec: 'generado hace {s} s',
    ageMin: 'generado hace {m} min',
    ageStale: ' – ¡regenerar!',
    toastRefreshed: '¡Todos los códigos QR regenerados!',
    toastAuto: 'Códigos QR actualizados automáticamente',
    toastCopied: '¡Friend code copiado!',
    toastPng: 'PNG descargado',
    toastPngs: '{n} PNG descargados',
    toastImported: '{n} código(s) importado(s)',
    importError: 'No se pudo leer el archivo (se espera una exportación JSON de esta app).',
    deleteConfirm: '¿Eliminar el friend code «{code}»?',
    modalHint: 'Mantén pulsada la imagen para guardarla en la galería; toca para cerrar',
    holderTitle: 'Toca para pantalla completa; mantén pulsado para guardar la imagen',
    qrAlt: 'Código QR de {code}',
  },
  pt: {
    subtitle: 'Salve quantos friend codes quiser e gere todos os códigos QR de uma vez – sempre novos e prontos para escanear no jogo. Tudo roda localmente; sua lista fica no seu aparelho.',
    addHeading: 'Adicionar friend code',
    codePlaceholder: 'Friend code (ex.: umd74s5q8)',
    addBtn: 'Adicionar',
    errInvalid: 'O friend code deve ter de 8 a 10 caracteres e conter apenas letras e números.',
    errDuplicate: 'Este friend code já está na sua lista.',
    refreshAll: '🔄 Regenerar',
    allImages: '🖼️ Todas as imagens',
    export: 'Exportar',
    import: 'Importar',
    freshHint: 'Dica: toque em “Regenerar” logo antes de escanear no jogo – o jogo prefere códigos recentes.',
    emptyTitle: 'Reúna seus guerreiros!',
    emptyText: 'Nenhum friend code salvo ainda. Adicione seu primeiro código acima.',
    installHint: '📲 Dica: use “Adicionar à tela inicial” no menu do navegador para transformar isto em um app – sua lista fica salva e os códigos QR são renovados a cada abertura.',
    footer: 'Ferramenta de fãs não oficial – sem vínculo com a Bandai Namco. Formato QR compatível com o leitor de amigos do Dragon Ball Legends.',
    btnNew: '🔄 Novo',
    btnImage: '🖼️ Imagem',
    btnCopy: '📋 Código',
    ageSec: 'gerado há {s} s',
    ageMin: 'gerado há {m} min',
    ageStale: ' – regenerar!',
    toastRefreshed: 'Todos os códigos QR regenerados!',
    toastAuto: 'Códigos QR atualizados automaticamente',
    toastCopied: 'Friend code copiado!',
    toastPng: 'PNG baixado',
    toastPngs: '{n} PNG(s) baixado(s)',
    toastImported: '{n} código(s) importado(s)',
    importError: 'Não foi possível ler o arquivo (esperado: exportação JSON deste app).',
    deleteConfirm: 'Excluir o friend code “{code}”?',
    modalHint: 'Toque e segure para salvar a imagem na galeria – toque para fechar',
    holderTitle: 'Toque para tela cheia – toque e segure para salvar a imagem',
    qrAlt: 'Código QR de {code}',
  },
  fr: {
    subtitle: 'Enregistrez autant de friend codes que vous voulez et générez tous les QR codes d’un coup – toujours frais et prêts à scanner dans le jeu. Tout fonctionne en local ; votre liste reste sur votre appareil.',
    addHeading: 'Ajouter un friend code',
    codePlaceholder: 'Friend code (ex. umd74s5q8)',
    addBtn: 'Ajouter',
    errInvalid: 'Le friend code doit comporter 8 à 10 caractères, uniquement des lettres et des chiffres.',
    errDuplicate: 'Ce friend code est déjà dans votre liste.',
    refreshAll: '🔄 Régénérer',
    allImages: '🖼️ Toutes les images',
    export: 'Exporter',
    import: 'Importer',
    freshHint: 'Astuce : appuyez sur « Régénérer » juste avant de scanner dans le jeu – le jeu préfère les codes récents.',
    emptyTitle: 'Rassemblez vos guerriers !',
    emptyText: 'Aucun friend code enregistré pour l’instant. Ajoutez votre premier code ci-dessus.',
    installHint: '📲 Astuce : via le menu du navigateur « Ajouter à l’écran d’accueil », transformez cette page en app – votre liste est conservée et les QR codes sont régénérés à chaque ouverture.',
    footer: 'Outil de fans non officiel – sans lien avec Bandai Namco. Format QR compatible avec le scanner d’amis de Dragon Ball Legends.',
    btnNew: '🔄 Nouveau',
    btnImage: '🖼️ Image',
    btnCopy: '📋 Code',
    ageSec: 'généré il y a {s} s',
    ageMin: 'généré il y a {m} min',
    ageStale: ' – à régénérer !',
    toastRefreshed: 'Tous les QR codes ont été régénérés !',
    toastAuto: 'QR codes actualisés automatiquement',
    toastCopied: 'Friend code copié !',
    toastPng: 'PNG téléchargé',
    toastPngs: '{n} PNG téléchargé(s)',
    toastImported: '{n} code(s) importé(s)',
    importError: 'Impossible de lire le fichier (attendu : un export JSON de cette app).',
    deleteConfirm: 'Supprimer le friend code « {code} » ?',
    modalHint: 'Appui long pour enregistrer l’image dans la galerie – touchez pour fermer',
    holderTitle: 'Touchez pour le plein écran – appui long pour enregistrer l’image',
    qrAlt: 'QR code de {code}',
  },
  ru: {
    subtitle: 'Сохраняйте любое количество friend-кодов и создавайте все QR-коды сразу – всегда свежие и готовые к сканированию в игре. Всё работает локально; список остаётся на вашем устройстве.',
    addHeading: 'Добавить friend-код',
    codePlaceholder: 'Friend-код (напр. umd74s5q8)',
    addBtn: 'Добавить',
    errInvalid: 'Friend-код должен содержать 8–10 символов: только буквы и цифры.',
    errDuplicate: 'Этот friend-код уже есть в вашем списке.',
    refreshAll: '🔄 Обновить все',
    allImages: '🖼️ Все картинки',
    export: 'Экспорт',
    import: 'Импорт',
    freshHint: 'Совет: нажмите «Обновить все» прямо перед сканированием в игре – игра любит свежие коды.',
    emptyTitle: 'Собери своих воинов!',
    emptyText: 'Пока нет сохранённых friend-кодов. Добавьте первый код выше.',
    installHint: '📲 Совет: через меню браузера «Добавить на главный экран» превратите страницу в приложение – список сохранится, а QR-коды будут свежими при каждом запуске.',
    footer: 'Неофициальный фанатский инструмент, не связан с Bandai Namco. Формат QR совместим со сканером друзей Dragon Ball Legends.',
    btnNew: '🔄 Новый',
    btnImage: '🖼️ Картинка',
    btnCopy: '📋 Код',
    ageSec: 'создан {s} с назад',
    ageMin: 'создан {m} мин назад',
    ageStale: ' – обновите!',
    toastRefreshed: 'Все QR-коды обновлены!',
    toastAuto: 'QR-коды обновлены автоматически',
    toastCopied: 'Friend-код скопирован!',
    toastPng: 'PNG скачан',
    toastPngs: 'Скачано PNG: {n}',
    toastImported: 'Импортировано кодов: {n}',
    importError: 'Не удалось прочитать файл (ожидается JSON-экспорт из этого приложения).',
    deleteConfirm: 'Удалить friend-код «{code}»?',
    modalHint: 'Долгое нажатие – сохранить картинку в галерею; коснитесь, чтобы закрыть',
    holderTitle: 'Нажмите для полного экрана; долгое нажатие – сохранить картинку',
    qrAlt: 'QR-код для {code}',
  },
  ja: {
    subtitle: 'フレンドコードをいくつでも保存して、すべてのQRコードを一度に生成。常に新しい状態でゲーム内スキャンにすぐ使えます。すべて端末内で動作し、リストは保存されます。',
    addHeading: 'フレンドコードを追加',
    codePlaceholder: 'フレンドコード（例: umd74s5q8）',
    addBtn: '追加',
    errInvalid: 'フレンドコードは8〜10文字の英数字で入力してください。',
    errDuplicate: 'このフレンドコードはすでにリストにあります。',
    refreshAll: '🔄 再生成',
    allImages: '🖼️ すべての画像',
    export: 'エクスポート',
    import: 'インポート',
    freshHint: 'ヒント: ゲームでスキャンする直前に「再生成」を押してください。新しいコードの方が確実です。',
    emptyTitle: '戦士を集めよう！',
    emptyText: 'まだフレンドコードがありません。上から最初のコードを追加してください。',
    installHint: '📲 ヒント: ブラウザメニューの「ホーム画面に追加」でアプリとして使えます。リストは保存され、開くたびにQRコードが自動更新されます。',
    footer: '非公式ファンツール – バンダイナムコとは無関係です。QR形式はドラゴンボール レジェンズのフレンドスキャナー互換。',
    btnNew: '🔄 更新',
    btnImage: '🖼️ 画像',
    btnCopy: '📋 コード',
    ageSec: '{s}秒前に生成',
    ageMin: '{m}分前に生成',
    ageStale: ' – 再生成してください！',
    toastRefreshed: 'すべてのQRコードを再生成しました！',
    toastAuto: 'QRコードを自動更新しました',
    toastCopied: 'フレンドコードをコピーしました！',
    toastPng: 'PNGをダウンロードしました',
    toastPngs: 'PNGを{n}件ダウンロードしました',
    toastImported: '{n}件のコードをインポートしました',
    importError: 'ファイルを読み込めませんでした（このアプリのJSONエクスポートが必要です）。',
    deleteConfirm: 'フレンドコード「{code}」を削除しますか？',
    modalHint: '長押しで画像をギャラリーに保存 – タップで閉じる',
    holderTitle: 'タップで全画面表示 – 長押しで画像を保存',
    qrAlt: '{code} のQRコード',
  },
};

const LANG_KEY = 'dbl-lang';
const SUPPORTED_LANGS = Object.keys(I18N);

function detectLang() {
  const saved = localStorage.getItem(LANG_KEY);
  if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  for (const tag of navigator.languages || [navigator.language || 'en']) {
    const base = String(tag).toLowerCase().split('-')[0];
    if (SUPPORTED_LANGS.includes(base)) return base;
  }
  return 'en';
}

let currentLang = detectLang();

function setLang(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  currentLang = lang;
  localStorage.setItem(LANG_KEY, lang);
  document.documentElement.lang = lang;
}

function t(key, vars) {
  let str = (I18N[currentLang] && I18N[currentLang][key]) || I18N.en[key] || key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace('{' + k + '}', v);
    }
  }
  return str;
}

// Uebertraegt alle data-i18n-Attribute (Text, Placeholder, title) in den DOM.
function applyStaticTranslations() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  const sel = document.getElementById('langSelect');
  if (sel) sel.value = currentLang;
}
