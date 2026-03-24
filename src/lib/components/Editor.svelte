<script lang="ts">
	import { onMount } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
	import Collaboration from '@tiptap/extension-collaboration';
	import Placeholder from '@tiptap/extension-placeholder';
	import { createLowlight } from 'lowlight';
	import javascript from 'highlight.js/lib/languages/javascript';
	import typescript from 'highlight.js/lib/languages/typescript';
	import python from 'highlight.js/lib/languages/python';
	import go from 'highlight.js/lib/languages/go';
	import rust from 'highlight.js/lib/languages/rust';
	import java from 'highlight.js/lib/languages/java';
	import xml from 'highlight.js/lib/languages/xml';
	import css from 'highlight.js/lib/languages/css';
	import json from 'highlight.js/lib/languages/json';
	import bash from 'highlight.js/lib/languages/bash';
	import type * as Y from 'yjs';

	const lowlight = createLowlight();
	lowlight.register('javascript', javascript);
	lowlight.register('js', javascript);
	lowlight.register('typescript', typescript);
	lowlight.register('ts', typescript);
	lowlight.register('python', python);
	lowlight.register('py', python);
	lowlight.register('go', go);
	lowlight.register('rust', rust);
	lowlight.register('rs', rust);
	lowlight.register('java', java);
	lowlight.register('html', xml);
	lowlight.register('xml', xml);
	lowlight.register('css', css);
	lowlight.register('json', json);
	lowlight.register('bash', bash);
	lowlight.register('sh', bash);

	interface Props {
		ydoc: Y.Doc;
	}

	let { ydoc }: Props = $props();

	let element: HTMLDivElement;

	onMount(() => {
		const editor = new Editor({
			element,
			extensions: [
				StarterKit.configure({
					undoRedo: false,
					codeBlock: false
				}),
				CodeBlockLowlight.configure({
					lowlight,
					defaultLanguage: 'javascript'
				}),
				Collaboration.configure({
					document: ydoc
				}),
				Placeholder.configure({
					placeholder: '여기에 입력하세요...'
				})
			],
			editorProps: {
				attributes: {
					class: 'focus:outline-none min-h-[500px]'
				}
			}
		});

		return () => {
			editor.destroy();
		};
	});
</script>

<div class="editor-wrapper">
	<div bind:this={element}></div>
</div>

<style>
	.editor-wrapper :global(.tiptap) {
		padding: 1rem 0;
		min-height: 500px;
	}

	.editor-wrapper :global(.tiptap:focus) {
		outline: none;
	}

	.editor-wrapper :global(.tiptap p.is-editor-empty:first-child::before) {
		content: attr(data-placeholder);
		float: left;
		color: #adb5bd;
		pointer-events: none;
		height: 0;
	}

	/* Headings */
	.editor-wrapper :global(.tiptap h1) {
		font-size: 2em;
		font-weight: 700;
		margin-top: 1.5rem;
		margin-bottom: 0.5rem;
	}

	.editor-wrapper :global(.tiptap h2) {
		font-size: 1.5em;
		font-weight: 600;
		margin-top: 1.25rem;
		margin-bottom: 0.5rem;
	}

	.editor-wrapper :global(.tiptap h3) {
		font-size: 1.25em;
		font-weight: 600;
		margin-top: 1rem;
		margin-bottom: 0.5rem;
	}

	/* Lists */
	.editor-wrapper :global(.tiptap ul) {
		list-style: disc;
		padding-left: 1.5rem;
	}

	.editor-wrapper :global(.tiptap ol) {
		list-style: decimal;
		padding-left: 1.5rem;
	}

	/* Code */
	.editor-wrapper :global(.tiptap pre) {
		background: #1e1e1e;
		color: #d4d4d4;
		border-radius: 0.5rem;
		padding: 1rem;
		font-family: 'JetBrains Mono', monospace;
		font-size: 0.875rem;
		overflow-x: auto;
		position: relative;
	}

	.editor-wrapper :global(.tiptap code) {
		background: #f0f0f0;
		border-radius: 0.25rem;
		padding: 0.15rem 0.3rem;
		font-size: 0.875em;
	}

	.editor-wrapper :global(.tiptap pre code) {
		background: none;
		padding: 0;
	}

	/* Syntax highlighting - VS Code Dark+ theme */
	.editor-wrapper :global(.tiptap pre code .hljs-keyword),
	.editor-wrapper :global(.tiptap pre code .hljs-selector-tag) {
		color: #569cd6;
	}

	.editor-wrapper :global(.tiptap pre code .hljs-literal),
	.editor-wrapper :global(.tiptap pre code .hljs-built_in) {
		color: #4ec9b0;
	}

	.editor-wrapper :global(.tiptap pre code .hljs-string),
	.editor-wrapper :global(.tiptap pre code .hljs-template-variable) {
		color: #ce9178;
	}

	.editor-wrapper :global(.tiptap pre code .hljs-number),
	.editor-wrapper :global(.tiptap pre code .hljs-selector-class) {
		color: #b5cea8;
	}

	.editor-wrapper :global(.tiptap pre code .hljs-comment),
	.editor-wrapper :global(.tiptap pre code .hljs-quote) {
		color: #6a9955;
		font-style: italic;
	}

	.editor-wrapper :global(.tiptap pre code .hljs-meta),
	.editor-wrapper :global(.tiptap pre code .hljs-tag) {
		color: #569cd6;
	}

	.editor-wrapper :global(.tiptap pre code .hljs-attribute),
	.editor-wrapper :global(.tiptap pre code .hljs-name) {
		color: #9cdcfe;
	}

	.editor-wrapper :global(.tiptap pre code .hljs-attr) {
		color: #9cdcfe;
	}

	.editor-wrapper :global(.tiptap pre code .hljs-type),
	.editor-wrapper :global(.tiptap pre code .hljs-class .hljs-title) {
		color: #4ec9b0;
	}

	.editor-wrapper :global(.tiptap pre code .hljs-function),
	.editor-wrapper :global(.tiptap pre code .hljs-title) {
		color: #dcdcaa;
	}

	.editor-wrapper :global(.tiptap pre code .hljs-variable),
	.editor-wrapper :global(.tiptap pre code .hljs-params) {
		color: #9cdcfe;
	}

	.editor-wrapper :global(.tiptap pre code .hljs-regexp) {
		color: #d16969;
	}

	.editor-wrapper :global(.tiptap pre code .hljs-symbol),
	.editor-wrapper :global(.tiptap pre code .hljs-bullet) {
		color: #d4d4d4;
	}

	.editor-wrapper :global(.tiptap pre code .hljs-punctuation) {
		color: #d4d4d4;
	}

	.editor-wrapper :global(.tiptap pre code .hljs-operator) {
		color: #d4d4d4;
	}

	.editor-wrapper :global(.tiptap pre code .hljs-property) {
		color: #9cdcfe;
	}

	.editor-wrapper :global(.tiptap pre code .hljs-template-tag) {
		color: #569cd6;
	}

	.editor-wrapper :global(.tiptap pre code .hljs-selector-id),
	.editor-wrapper :global(.tiptap pre code .hljs-selector-attr),
	.editor-wrapper :global(.tiptap pre code .hljs-selector-pseudo) {
		color: #d7ba7d;
	}

	.editor-wrapper :global(.tiptap pre code .hljs-addition) {
		color: #b5cea8;
		background: rgba(155, 185, 85, 0.1);
	}

	.editor-wrapper :global(.tiptap pre code .hljs-deletion) {
		color: #ce9178;
		background: rgba(206, 145, 120, 0.1);
	}

	.editor-wrapper :global(.tiptap pre code .hljs-section) {
		color: #569cd6;
		font-weight: bold;
	}

	/* Blockquote */
	.editor-wrapper :global(.tiptap blockquote) {
		border-left: 3px solid #e0e0e0;
		padding-left: 1rem;
		color: #666;
		margin: 1rem 0;
	}

	/* Horizontal rule */
	.editor-wrapper :global(.tiptap hr) {
		border: none;
		border-top: 1px solid #e0e0e0;
		margin: 1.5rem 0;
	}

	/* Collaboration cursor */
	.editor-wrapper :global(.collaboration-cursor__caret) {
		border-left: 1px solid #0d0d0d;
		border-right: 1px solid #0d0d0d;
		margin-left: -1px;
		margin-right: -1px;
		pointer-events: none;
		position: relative;
		word-break: normal;
	}

	.editor-wrapper :global(.collaboration-cursor__label) {
		border-radius: 3px 3px 3px 0;
		color: #fff;
		font-size: 12px;
		font-weight: 600;
		left: -1px;
		line-height: normal;
		padding: 0.1rem 0.3rem;
		position: absolute;
		top: -1.4em;
		user-select: none;
		white-space: nowrap;
	}
</style>
