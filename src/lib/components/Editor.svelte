<script lang="ts">
	import { onMount } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import Collaboration from '@tiptap/extension-collaboration';
	import Placeholder from '@tiptap/extension-placeholder';
	import type * as Y from 'yjs';

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
					undoRedo: false
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
				},
				handleKeyDown(view, event) {
					if (event.key === 'Tab') {
						event.preventDefault();
						const { state, dispatch } = view;
						const { selection } = state;
						const { to, empty } = selection;
						const resolvedFrom = selection.resolvedFrom;

						// In code blocks, insert a tab character; elsewhere use 2 spaces
						const isCodeBlock = resolvedFrom.parent.type.name === 'codeBlock';
						const indent = isCodeBlock ? '\t' : '  ';

						if (event.shiftKey) {
							// Outdent: remove leading indent from the current line
							const parentText = resolvedFrom.parent.textContent;
							const lineOffset = parentText.lastIndexOf('\n', resolvedFrom.parentOffset - 1) + 1;
							const lineStart = resolvedFrom.start() + lineOffset;
							const lineText = parentText.slice(lineOffset);
							const leadingChars = lineText.match(/^(\t| {2})/);
							if (leadingChars) {
								const removeLength = leadingChars[0].length;
								dispatch(state.tr.delete(lineStart, lineStart + removeLength));
							}
						} else if (!empty) {
							// Indent each line covered by the selection
							const blockStart = resolvedFrom.start();
							const blockText = resolvedFrom.parent.textContent;

							// Collect the document positions of each line start within the selection
							const lineStarts: number[] = [];
							// Always include the line that contains `from`
							const firstLineOffset = blockText.lastIndexOf('\n', resolvedFrom.parentOffset - 1) + 1;
							lineStarts.push(blockStart + firstLineOffset);

							// Walk through newlines between from and to that are in the same block
							let searchFrom = firstLineOffset;
							while (true) {
								const nextNl = blockText.indexOf('\n', searchFrom);
								if (nextNl === -1 || blockStart + nextNl >= to) break;
								lineStarts.push(blockStart + nextNl + 1);
								searchFrom = nextNl + 1;
							}

							// Insert indents from back to front so positions stay valid
							let tr = state.tr;
							for (let i = lineStarts.length - 1; i >= 0; i--) {
								tr = tr.insertText(indent, lineStarts[i]);
							}
							dispatch(tr);
						} else {
							// Indent: insert at cursor position
							dispatch(state.tr.insertText(indent));
						}
						return true;
					}
					return false;
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
