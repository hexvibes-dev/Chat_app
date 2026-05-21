# Estructura del proyecto

**Generado:** 5/20/2026, 1:20:30 PM

**Ignorados:** node_modules, .git, .vscode, dist, .astro

**Profundidad:** Ilimitada

```
📁 ./
├── 📁 public
│   ├── 📁 emojis
│   │   ├── 📄 512-18.webp
│   │   ├── 📄 512-8.webp
│   │   ├── 📄 512.gif
│   │   └── 📄 512.webp
│   ├── 📁 fonts
│   │   └── 📄 NotoColorEmoji.ttf
│   ├── 📁 img
│   │   ├── 📁 emojis
│   │   │   ├── 📄 ico.png
│   │   │   ├── 📄 ico.webp
│   │   │   ├── 📄 ico2.png
│   │   │   ├── 📄 ico3.png
│   │   │   ├── 📄 ico4.png
│   │   │   ├── 📄 ico5.png
│   │   │   ├── 📄 ico6.png
│   │   │   └── 📄 ico7.png
│   │   ├── 📁 stickers
│   │   │   └── 📄 sticker.jpg
│   │   ├── 📄 ballena.jpg
│   │   ├── 📄 bg.jpg
│   │   ├── 📄 dark.jpg
│   │   ├── 📄 default-avatar.png
│   │   ├── 📄 fondo-login-mov.jpg
│   │   ├── 📄 light.jpg
│   │   ├── 📄 magic.jpg
│   │   ├── 📄 nubes.jpg
│   │   ├── 📄 patron1.jpg
│   │   └── 📄 planton.jpg
│   ├── 📁 sounds
│   │   ├── 📄 click.mp3
│   │   ├── 📄 message-receive.mp3
│   │   ├── 📄 message-send.mp3
│   │   ├── 📄 notification.mp3
│   │   ├── 📄 reaction-add.mp3
│   │   └── 📄 reaction-remove.mp3
│   └── 📁 stickers
│       ├── 📄 ico1.webp
│       ├── 📄 ico2.webp
│       └── 📄 ico3.webp
├── 📁 src
│   ├── 📁 assets
│   ├── 📁 components
│   │   ├── 📄 App.astro
│   │   ├── 📄 Chat.astro
│   │   └── 📄 DraggableResizable.astro
│   ├── 📁 layouts
│   │   └── 📄 Layout.astro
│   ├── 📁 pages
│   │   ├── 📄 index.astro
│   │   └── 📄 start.astro
│   ├── 📁 scripts
│   │   ├── 📁 CacheManager
│   │   │   └── 📄 CacheManager.js
│   │   ├── 📁 editor
│   │   │   ├── 📄 EditorCSSEditor.js
│   │   │   ├── 📄 EditorCSSValidator.js
│   │   │   ├── 📄 EditorManager.js
│   │   │   ├── 📄 EditorModal.js
│   │   │   ├── 📄 FloatingPreview.js
│   │   │   ├── 📄 GlobalColorPicker.js
│   │   │   └── 📄 SearchModal.js
│   │   ├── 📁 Emojis
│   │   │   ├── 📄 CustomEmojiManager.js
│   │   │   ├── 📄 CustomEmojiModal.js
│   │   │   ├── 📄 CustomEmojiPicker.js
│   │   │   ├── 📄 EmojiCategories.js
│   │   │   ├── 📄 EmojiData.js
│   │   │   ├── 📄 emojiMessage.js
│   │   │   ├── 📄 EmojiPicker.js
│   │   │   ├── 📄 EmojiPickerButton.js
│   │   │   ├── 📄 EmojiPickerCore.js
│   │   │   ├── 📄 EmojiPickerDesktop.js
│   │   │   ├── 📄 emojiPolyfill.js
│   │   │   ├── 📄 EmojiRecent.js
│   │   │   ├── 📄 EmojiSearch.js
│   │   │   ├── 📄 emojiUtils.js
│   │   │   ├── 📄 skinToneManager.js
│   │   │   └── 📄 StaticEmojiCategories.js
│   │   ├── 📁 Gifs
│   │   │   └── 📄 GifsPicker.js
│   │   ├── 📁 Messages
│   │   │   ├── 📄 addReaction.js
│   │   │   ├── 📄 answer.js
│   │   │   ├── 📄 contactStatus.js
│   │   │   ├── 📄 editModal.js
│   │   │   ├── 📄 emojiReplacement.js
│   │   │   ├── 📄 EmojiSuggestions.js
│   │   │   ├── 📄 hour.js
│   │   │   ├── 📄 input.js
│   │   │   ├── 📄 messages.js
│   │   │   ├── 📄 NativeEmojiKeywords.js
│   │   │   ├── 📄 options.js
│   │   │   ├── 📄 position.js
│   │   │   ├── 📄 reactionAnimations.js
│   │   │   ├── 📄 reactionEmojiReplacement.js
│   │   │   └── 📄 reactions.js
│   │   ├── 📁 Modals
│   │   │   ├── 📄 ActionMenu.js
│   │   │   ├── 📄 AvatarEditorModal.js
│   │   │   ├── 📄 hamburgerMenu.js
│   │   │   ├── 📄 main.js
│   │   │   └── 📄 themeManager.js
│   │   ├── 📁 Paint
│   │   │   └── 📄 PaintModal.js
│   │   ├── 📁 Server
│   │   │   ├── 📄 queue.js
│   │   │   ├── 📄 socket.js
│   │   │   ├── 📄 socketUtils.js
│   │   │   └── 📄 user.js
│   │   ├── 📁 Sounds
│   │   │   ├── 📄 globalSounds.js
│   │   │   ├── 📄 soundManager.js
│   │   │   └── 📄 SoundSettingsModal.js
│   │   ├── 📁 Stickers
│   │   │   ├── 📄 CustomSticker.js
│   │   │   ├── 📄 StickerManager.js
│   │   │   ├── 📄 StickerModal.js
│   │   │   └── 📄 StickersPicker.js
│   │   ├── 📁 Utils
│   │   │   ├── 📄 automsj.js
│   │   │   ├── 📄 globals.d.ts
│   │   │   ├── 📄 keyboard.js
│   │   │   ├── 📄 modalStackManager.js
│   │   │   ├── 📄 notifications.js
│   │   │   ├── 📄 scroll.js
│   │   │   └── 📄 scrollButton.js
│   │   ├── 📄 main.js
│   │   └── 📄 VirtualScroller.js
│   └── 📁 styles
│       ├── 📁 chat
│       │   ├── 📁 emojiPickerButtom
│       │   ├── 📁 themes
│       │   │   ├── 📄 basic.css
│       │   │   ├── 📄 cristal.css
│       │   │   ├── 📄 dark.css
│       │   │   ├── 📄 default.css
│       │   │   ├── 📄 forest.css
│       │   │   ├── 📄 light.css
│       │   │   ├── 📄 magenta.css
│       │   │   ├── 📄 midnight.css
│       │   │   ├── 📄 nuevo.css
│       │   │   ├── 📄 ocean.css
│       │   │   ├── 📄 reference.css
│       │   │   ├── 📄 terminal.css
│       │   │   └── 📄 whatsapp.css
│       │   ├── 📄 actionMenu.css
│       │   ├── 📄 animations.css
│       │   ├── 📄 avatarEditor.css
│       │   ├── 📄 cacheCleaner.css
│       │   ├── 📄 colorPicker.css
│       │   ├── 📄 customEmoji.css
│       │   ├── 📄 customSticker.css
│       │   ├── 📄 editor.css
│       │   ├── 📄 editorModal.css
│       │   ├── 📄 emoji-messages.css
│       │   ├── 📄 emojiFont.css
│       │   ├── 📄 emojiPicker.css
│       │   ├── 📄 emojiPickerDesktop.css
│       │   ├── 📄 emojiSuggestions.css
│       │   ├── 📄 hamburger.css
│       │   ├── 📄 modals.css
│       │   ├── 📄 name.css
│       │   ├── 📄 paintModal.css
│       │   ├── 📄 reactions.css
│       │   ├── 📄 reply-indicator.css
│       │   ├── 📄 reply-popup.css
│       │   ├── 📄 reset.css
│       │   ├── 📄 scrollButton.css
│       │   ├── 📄 searchModal.css
│       │   ├── 📄 soundsSettingsModal.css
│       │   ├── 📄 style.css
│       │   ├── 📄 themeModal.css
│       │   ├── 📄 themes.css
│       │   └── 📄 transient-notif.css
│       ├── 📄 animate.css
│       └── 📄 global.css
├── 📄 .gitignore
├── 📄 astro.config.mjs
├── 📄 package.json
├── 📄 pnpm-lock.yaml
├── 📄 pnpm-workspace.yaml
└── 📄 tsconfig.json
```