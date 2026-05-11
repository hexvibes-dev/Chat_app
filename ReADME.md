./
├── public/
│   ├── emojis/
│   │   ├── 512-18.webp
│   │   ├── 512-8.webp
│   │   ├── 512.gif
│   │   └── 512.webp
│   ├── fonts/
│   │   └── NotoColorEmoji.ttf
│   ├── img/
│   │   ├── emojis/
│   │   │   ├── ico.png
│   │   │   ├── ico.webp
│   │   │   ├── ico2.png
│   │   │   ├── ico3.png
│   │   │   ├── ico4.png
│   │   │   ├── ico5.png
│   │   │   ├── ico6.png
│   │   │   └── ico7.png
│   │   ├── stickers/
│   │   │   └── sticker.jpg
│   │   ├── ballena.jpg
│   │   ├── bg.jpg
│   │   ├── dark.jpg
│   │   ├── default-avatar.png
│   │   ├── fondo-login-mov.jpg
│   │   ├── light.jpg
│   │   ├── magic.jpg
│   │   ├── nubes.jpg
│   │   ├── patron1.jpg
│   │   └── planton.jpg
│   ├── sounds/
│   │   ├── click.mp3
│   │   ├── message-receive.mp3
│   │   ├── message-send.mp3
│   │   ├── notification.mp3
│   │   ├── reaction-add.mp3
│   │   └── reaction-remove.mp3
│   └── stickers/
│       ├── ico1.webp
│       ├── ico2.webp
│       └── ico3.webp
├── src/
│   ├── assets/
│   ├── components/
│   │   ├── App.astro
│   │   ├── Chat.astro
│   │   └── DraggableResizable.astro
│   ├── layouts/
│   │   └── Layout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   └── start.astro
│   ├── scripts/
│   │   ├── CacheManager/
│   │   │   └── CacheManager.js
│   │   ├── Emojis/
│   │   │   ├── CustomEmojiManager.js
│   │   │   ├── CustomEmojiModal.js
│   │   │   ├── CustomEmojiPicker.js
│   │   │   ├── EmojiCategories.js
│   │   │   ├── EmojiData.js
│   │   │   ├── EmojiPicker.js
│   │   │   ├── EmojiPickerButton.js
│   │   │   ├── EmojiPickerCore.js
│   │   │   ├── EmojiPickerDesktop.js
│   │   │   ├── EmojiRecent.js
│   │   │   ├── EmojiSearch.js
│   │   │   ├── StaticEmojiCategories.js
│   │   │   ├── emojiMessage.js
│   │   │   ├── emojiPolyfill.js
│   │   │   ├── emojiUtils.js
│   │   │   └── skinToneManager.js
│   │   ├── Gifs/
│   │   │   └── GifsPicker.js
│   │   ├── Messages/
│   │   │   ├── EmojiSuggestions.js
│   │   │   ├── NativeEmojiKeywords.js
│   │   │   ├── addReaction.js
│   │   │   ├── answer.js
│   │   │   ├── contactStatus.js
│   │   │   ├── editModal.js
│   │   │   ├── emojiReplacement.js
│   │   │   ├── hour.js
│   │   │   ├── input.js
│   │   │   ├── messages.js
│   │   │   ├── options.js
│   │   │   ├── position.js
│   │   │   ├── reactionAnimations.js
│   │   │   ├── reactionEmojiReplacement.js
│   │   │   └── reactions.js
│   │   ├── Modals/
│   │   │   ├── ActionMenu.js
│   │   │   ├── AvatarEditorModal.js
│   │   │   ├── hamburgerMenu.js
│   │   │   └── themeManager.js
│   │   ├── Paint/
│   │   │   └── PaintModal.js
│   │   ├── Server/
│   │   │   ├── queue.js
│   │   │   ├── socket.js
│   │   │   ├── socketUtils.js
│   │   │   └── user.js
│   │   ├── Sounds/
│   │   │   ├── SoundSettingsModal.js
│   │   │   ├── globalSounds.js
│   │   │   └── soundManager.js
│   │   ├── Stickers/
│   │   │   ├── CustomSticker.js
│   │   │   ├── StickerManager.js
│   │   │   ├── StickerModal.js
│   │   │   └── StickersPicker.js
│   │   ├── Utils/
│   │   │   ├── DebugLogger.js
│   │   │   ├── automsj.js
│   │   │   ├── globals.d.ts
│   │   │   ├── keyboard.js
│   │   │   ├── modalStackManager.js
│   │   │   ├── notifications.js
│   │   │   ├── scroll.js
│   │   │   └── scrollButton.js
│   │   ├── editor/
│   │   │   ├── EditorCSSEditor.js
│   │   │   ├── EditorCSSValidator.js
│   │   │   ├── EditorManager.js
│   │   │   ├── EditorModal.js
│   │   │   ├── FloatingPreview.js
│   │   │   ├── GlobalColorPicker.js
│   │   │   └── SearchModal.js
│   │   ├── VirtualScroller.js
│   │   └── main.js
│   └── styles/
│       ├── chat/
│       │   ├── emojiPickerButtom/
│       │   │   └── emojiPicker.css
│       │   ├── themes/
│       │   │   ├── basic.css
│       │   │   ├── cristal.css
│       │   │   ├── dark.css
│       │   │   ├── default.css
│       │   │   ├── forest.css
│       │   │   ├── light.css
│       │   │   ├── magenta.css
│       │   │   ├── midnight.css
│       │   │   ├── nuevo.css
│       │   │   ├── ocean.css
│       │   │   ├── reference.css
│       │   │   └── whatsapp.css
│       │   ├── actionMenu.css
│       │   ├── animations.css
│       │   ├── avatarEditor.css
│       │   ├── cacheCleaner.css
│       │   ├── colorPicker.css
│       │   ├── customEmoji.css
│       │   ├── customSticker.css
│       │   ├── editor.css
│       │   ├── editorModal.css
│       │   ├── emoji-messages.css
│       │   ├── emojiFont.css
│       │   ├── emojiPicker.css
│       │   ├── emojiPickerDesktop.css
│       │   ├── emojiSuggestions.css
│       │   ├── hamburger.css
│       │   ├── modals.css
│       │   ├── name.css
│       │   ├── paintModal.css
│       │   ├── reactions.css
│       │   ├── reply-indicator.css
│       │   ├── reply-popup.css
│       │   ├── reset.css
│       │   ├── scrollButton.css
│       │   ├── searchModal.css
│       │   ├── soundsSettingsModal.css
│       │   ├── style.css
│       │   ├── themeModal.css
│       │   ├── themes.css
│       │   └── transient-notif.css
│       ├── animate.css
│       └── global.css
├── README.md
├── ReADME.md
├── astro.config.mjs
├── estructura.md
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── tsconfig.json
└── xd.pyn

30 directories, 158 files
