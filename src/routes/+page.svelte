<script lang="ts">
	import { FileUpload, FileInspector } from '$lib/components';
	
	let selectedFile: File | null = $state(null);
	let fileType: 'zip' | 'single' | null = $state(null);
	let fileContent = $state<{ content: string; fileName: string } | null>(null);

	function handleFileSelected(event: CustomEvent<{ file: File; type: 'zip' | 'single' }>) {
		selectedFile = event.detail.file;
		fileType = event.detail.type;
		fileContent = null;
	}

	function handleFileRemoved() {
		selectedFile = null;
		fileType = null;
		fileContent = null;
	}

	function handleFileContent(event: CustomEvent<{ content: string; fileName: string }>) {
		fileContent = event.detail;
	}
</script>

<div class="container mx-auto px-4 py-8 max-w-6xl">
	<div class="text-center mb-8">
		<h1 class="text-4xl font-bold mb-4">LionWeb Inspector</h1>
		<p class="text-lg text-gray-600 dark:text-gray-400">
			Upload and inspect files or ZIP archives to explore their contents
		</p>
	</div>

	<div class="grid gap-8 lg:grid-cols-2">
		<div>
			<FileUpload 
				on:fileSelected={handleFileSelected}
				on:fileRemoved={handleFileRemoved}
			/>
		</div>
		
		<div>
			<FileInspector 
				file={selectedFile}
				fileType={fileType}
				on:fileContent={handleFileContent}
			/>
		</div>
	</div>

	{#if fileContent}
		<div class="mt-8">
			<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
				<h2 class="text-2xl font-semibold mb-4">Content Preview</h2>
				<div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-auto">
					<pre class="text-sm whitespace-pre-wrap break-words">{fileContent.content}</pre>
				</div>
			</div>
		</div>
	{/if}
</div>
