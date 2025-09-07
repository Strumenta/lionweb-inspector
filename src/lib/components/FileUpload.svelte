<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Upload, File as FileIcon, Archive, X } from '@lucide/svelte';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{
		fileSelected: { file: File; type: 'zip' | 'single' };
		fileRemoved: void;
	}>();

	let fileInput: HTMLInputElement;
	let isDragOver = $state(false);
	let selectedFile: File | null = $state(null);
	let fileType: 'zip' | 'single' | null = $state(null);

	function handleFileSelect(file: File) {
		selectedFile = file;
		
		// Determine file type based on extension
		const fileName = file.name.toLowerCase();
		if (fileName.endsWith('.zip') || fileName.endsWith('.jar') || fileName.endsWith('.war') || fileName.endsWith('.sps')) {
			fileType = 'zip';
		} else {
			fileType = 'single';
		}
		
		dispatch('fileSelected', { file, type: fileType });
	}

	function handleInputChange(event: Event) {
		const target = event.target as HTMLInputElement;
		const file = target.files?.[0];
		if (file) {
			handleFileSelect(file);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		isDragOver = false;
		
		const file = event.dataTransfer?.files[0];
		if (file) {
			handleFileSelect(file);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		isDragOver = true;
	}

	function handleDragLeave(event: DragEvent) {
		event.preventDefault();
		isDragOver = false;
	}

	function removeFile() {
		selectedFile = null;
		fileType = null;
		if (fileInput) {
			fileInput.value = '';
		}
		dispatch('fileRemoved');
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}
</script>

<Card class="w-full max-w-2xl mx-auto">
	<CardHeader>
		<CardTitle class="flex items-center gap-2">
			<Upload class="h-5 w-5" />
			File Inspector
		</CardTitle>
		<CardDescription>
			Upload a ZIP archive containing LionWeb JSON chunks and protobuffer files
		</CardDescription>
	</CardHeader>
	<CardContent>
		{#if !selectedFile}
			<div
				class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center transition-colors {isDragOver ? 'border-primary bg-primary/5' : 'hover:border-primary/50'}"
				ondrop={handleDrop}
				ondragover={handleDragOver}
				ondragleave={handleDragLeave}
				role="button"
				tabindex="0"
				onclick={() => fileInput?.click()}
				onkeydown={(e) => e.key === 'Enter' && fileInput?.click()}
			>
				<Upload class="h-12 w-12 mx-auto mb-4 text-gray-400" />
				<p class="text-lg font-medium mb-2">Drop your file here</p>
				<p class="text-sm text-gray-500 mb-4">or click to browse</p>
				<Button variant="outline">
					<Upload class="h-4 w-4 mr-2" />
					Choose File
				</Button>
			</div>
		{:else}
			<div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
				<div class="flex items-center gap-3">
					{#if fileType === 'zip'}
						<Archive class="h-8 w-8 text-blue-500" />
					{:else}
						<FileIcon class="h-8 w-8 text-gray-500" />
					{/if}
					<div>
						<p class="font-medium">{selectedFile.name}</p>
						<p class="text-sm text-gray-500">
							{formatFileSize(selectedFile.size)} • {fileType === 'zip' ? 'Archive' : 'Single file'}
						</p>
					</div>
				</div>
				<Button variant="ghost" size="icon" onclick={removeFile}>
					<X class="h-4 w-4" />
				</Button>
			</div>
		{/if}
		
		<input
			bind:this={fileInput}
			type="file"
			class="hidden"
			onchange={handleInputChange}
			accept=".zip,.jar,.war,.sps,.json,.xml,.txt,.md,.js,.ts,.html,.css,.py,.java,.cpp,.c,.h,.hpp,.cs,.php,.rb,.go,.rs,.swift,.kt,.scala,.r,.m,.pl,.sh,.bat,.ps1,.sql,.yaml,.yml,.toml,.ini,.cfg,.conf,.log,.csv,.tsv,.xlsx,.xls,.pdf,.doc,.docx,.ppt,.pptx,.pb"
		/>
	</CardContent>
</Card>
