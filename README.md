# Estructura del proyecto
```
📁 ./
├── 📁 public
│   ├── 📁 emojis
│   ├── 📁 fonts
│   │   └── 📄 NotoColorEmoji.ttf
│   ├── 📁 img
│   │   ├── 📁 emojis
│   │   ├── 📁 stickers
│   ├── 📁 sounds
│   └── 📁 stickers
├── 📁 src
│   ├── 📁 assets
│   ├── 📁 components
│   │   ├── 📄 App.astro
│   │   ├── 📄 Chat.astro
│   │   └── 📄DraggableResizable.astro
│   ├── 📁 layouts
│   │   └── 📄 Layout.astro
│   ├── 📁 pages
│   │   ├── 📄 index.astro
│   │   └── 📄 start.astro
│   ├── 📁 scripts
│   │   ├── 📁 CacheManager
│   │   │   └── 📄 CacheManager.js
│   │   │   └── 📄 cacheEventManager.js
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
│   │   │   ├── 📄 DebugLogger.js
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
│       │   │   └── 📄 emojiPicker.css
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
└── 📄 README.md
```