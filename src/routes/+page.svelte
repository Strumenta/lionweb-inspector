<script lang="ts">
	import { FileUpload } from '$lib/components';
	import ImportingProcess from '$lib/components/ImportingProcess.svelte';
	import ChunkViewer from '$lib/components/ChunkViewer.svelte';
	import FileInspectorModal from '$lib/components/FileInspectorModal.svelte';
	
	let selectedFile: File | null = $state(null);
	let fileType: 'zip' | 'single' | null = $state(null);
	let showImportingModal = $state(false);
	let showChunkViewer = $state(false);
	let importingZipInfo: any = $state(null);
	let totalPartitions: number = $state(0);
	let importedData: {
		jsonFiles: Array<{ name: string; content: any; size: number }>;
		pbFiles: Array<{ name: string; content: any; size: number; type: 'bulk' | 'chunk' | 'unknown' }>;
	} | null = $state(null);

	function handleFileSelected(event: CustomEvent<{ file: File; type: 'zip' | 'single' }>) {
		selectedFile = event.detail.file;
		fileType = event.detail.type;
	}

	function handleFileRemoved() {
		selectedFile = null;
		fileType = null;
		showImportingModal = false;
		showChunkViewer = false;
		importedData = null;
	}

	async function handleAutoInspect(event: CustomEvent<{ file: File; type: 'zip' | 'single' }>) {
		showImportingModal = true;
		
		// Calculate total partitions immediately
		if (event.detail.type === 'zip') {
			try {
				const JSZip = (await import('jszip')).default;
				const zip = new JSZip();
				const zipData = await event.detail.file.arrayBuffer();
				const zipContents = await zip.loadAsync(zipData);
				const allFiles = Object.keys(zipContents.files);
				const jsonFiles = allFiles.filter(fileName => fileName.toLowerCase().endsWith('.json'));
				const pbFiles = allFiles.filter(fileName => fileName.toLowerCase().endsWith('.pb'));
				totalPartitions = jsonFiles.length + pbFiles.length;
				
				// Set initial zipInfo with total count
				importingZipInfo = {
					fileCount: allFiles.length,
					loadingTime: 0,
					progress: 0,
					jsonFiles: [],
					pbFiles: [],
					totalPartitions: totalPartitions
				};
			} catch (err) {
				console.error('Failed to calculate total partitions:', err);
			}
		}
	}

	function handleImportProgress(event: CustomEvent<{ zipInfo: any }>) {
		importingZipInfo = event.detail.zipInfo;
	}

	function handleImportComplete(event: CustomEvent<{
		jsonFiles: Array<{ name: string; content: any; size: number }>;
		pbFiles: Array<{ name: string; content: any; size: number; type: 'bulk' | 'chunk' | 'unknown' }>;
	}>) {
		importedData = event.detail;
		showChunkViewer = true;
	}
</script>

{#if showChunkViewer && importedData}
	<!-- Chunk Viewer Mode -->
	<div class="h-screen flex flex-col">
		<div class="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6 py-4">
			<div class="flex items-center justify-between">
				<div>
					<h1 class="text-2xl font-bold">LionWeb Inspector</h1>
					<p class="text-sm text-gray-600 dark:text-gray-400">
						Viewing {importedData.jsonFiles.length + importedData.pbFiles.length} chunks from {selectedFile?.name}
					</p>
				</div>
				<button 
					class="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
					onclick={() => {
						showChunkViewer = false;
						importedData = null;
						selectedFile = null;
						fileType = null;
					}}
				>
					Upload New File
				</button>
			</div>
		</div>
		<div class="flex-1 overflow-hidden">
			<ChunkViewer 
				jsonFiles={importedData.jsonFiles}
				pbFiles={importedData.pbFiles}
			/>
		</div>
	</div>
{:else}
	<!-- Upload Mode -->
	<div class="container mx-auto px-4 py-8 max-w-4xl">
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold mb-4">LionWeb Inspector</h1>
			<p class="text-lg text-gray-600 dark:text-gray-400">
				Upload and inspect ZIP archives containing LionWeb JSON chunks and protobuffer files
			</p>
		</div>

		<div class="flex justify-center">
			<FileUpload 
				on:fileSelected={handleFileSelected}
				on:fileRemoved={handleFileRemoved}
				on:autoInspect={handleAutoInspect}
			/>
		</div>
	</div>
{/if}

<!-- File Inspector Modal (hidden, handles the actual processing) -->
<FileInspectorModal 
	file={selectedFile}
	fileType={fileType}
	on:progress={handleImportProgress}
	on:complete={handleImportComplete}
/>

<!-- Importing Process Modal -->
<ImportingProcess 
	bind:isOpen={showImportingModal}
	bind:isLoading={showImportingModal}
	bind:zipInfo={importingZipInfo}
	on:importComplete={handleImportComplete}
/>
