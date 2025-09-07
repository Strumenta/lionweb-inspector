<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { File as FileIcon, Archive, Folder, Code, Image, FileText, Download, Clock, FileJson } from '@lucide/svelte';
	import { createEventDispatcher } from 'svelte';
	import JSZip from 'jszip';

	const dispatch = createEventDispatcher<{
		fileContent: { content: string; fileName: string };
	}>();

	let { file = null, fileType = null }: {
		file?: File | null;
		fileType?: 'zip' | 'single' | null;
	} = $props();

	let fileContent = $state<string>('');
	let isLoading = $state(false);
	let error = $state<string>('');
	let zipInfo = $state<{
		fileCount: number;
		loadingTime: number;
		progress: number;
		jsonFiles: Array<{ name: string; content: any; size: number }>;
	} | null>(null);
	let startTime = $state<number>(0);

	async function inspectFile() {
		if (!file) return;
		
		isLoading = true;
		error = '';
		zipInfo = null;
		startTime = Date.now();
		
		try {
			if (fileType === 'zip') {
				await inspectZipFile();
			} else {
				// Throw error for non-ZIP files
				throw new Error('Only ZIP files (.zip, .jar, .war, .sps) are supported. Please upload a ZIP archive containing LionWeb JSON chunks.');
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to inspect file';
		} finally {
			isLoading = false;
		}
	}

	async function inspectSingleFile() {
		if (!file) return;
		
		const text = await file.text();
		fileContent = text;
		dispatch('fileContent', { content: text, fileName: file.name });
	}

	async function inspectZipFile() {
		if (!file) return;
		
		const zip = new JSZip();
		const zipData = await file.arrayBuffer();
		
		// Load the ZIP file
		const zipContents = await zip.loadAsync(zipData);
		
		// Get all files in the ZIP
		const allFiles = Object.keys(zipContents.files);
		const jsonFiles = allFiles.filter(fileName => fileName.toLowerCase().endsWith('.json'));
		
		// Initialize ZIP info
		zipInfo = {
			fileCount: allFiles.length,
			loadingTime: 0,
			progress: 0,
			jsonFiles: []
		};
		
		// Process JSON files
		let processedCount = 0;
		const totalJsonFiles = jsonFiles.length;
		
		for (const fileName of jsonFiles) {
			try {
				const zipFile = zipContents.files[fileName];
				if (!zipFile.dir) {
					const content = await zipFile.async('text');
					const jsonContent = JSON.parse(content);
					
					zipInfo.jsonFiles.push({
						name: fileName,
						content: jsonContent,
						size: content.length
					});
				}
			} catch (err) {
				console.warn(`Failed to parse JSON file ${fileName}:`, err);
			}
			
			processedCount++;
			zipInfo.progress = Math.round((processedCount / totalJsonFiles) * 100);
		}
		
		// Update loading time
		zipInfo.loadingTime = Date.now() - startTime;
		
		// Create summary content
		const summary = {
			zipFile: file.name,
			totalFiles: allFiles.length,
			jsonFiles: jsonFiles.length,
			loadingTime: zipInfo.loadingTime,
			jsonChunks: zipInfo.jsonFiles.map(f => ({
				name: f.name,
				size: f.size,
				hasContent: !!f.content
			}))
		};
		
		fileContent = JSON.stringify(summary, null, 2);
		dispatch('fileContent', { content: fileContent, fileName: file.name });
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	function getFileIcon(fileName: string) {
		const ext = fileName.split('.').pop()?.toLowerCase();
		switch (ext) {
			case 'zip':
			case 'jar':
			case 'war':
			case 'sps':
				return Archive;
			case 'js':
			case 'ts':
			case 'jsx':
			case 'tsx':
			case 'py':
			case 'java':
			case 'cpp':
			case 'c':
			case 'cs':
			case 'php':
			case 'rb':
			case 'go':
			case 'rs':
			case 'swift':
			case 'kt':
			case 'scala':
				return Code;
			case 'png':
			case 'jpg':
			case 'jpeg':
			case 'gif':
			case 'svg':
			case 'webp':
				return Image;
			case 'txt':
			case 'md':
			case 'json':
			case 'xml':
			case 'yaml':
			case 'yml':
			case 'csv':
				return FileText;
			default:
				return FileIcon;
		}
	}

	// Watch for file changes
	$effect(() => {
		if (file) {
			fileContent = '';
			error = '';
		}
	});
</script>

{#if file}
	<Card class="w-full">
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				{#if fileType === 'zip'}
					<Archive class="h-5 w-5" />
				{:else}
					{@const IconComponent = getFileIcon(file.name)}
					<IconComponent class="h-5 w-5" />
				{/if}
				File Inspector
			</CardTitle>
			<CardDescription>
				Inspecting: {file.name} ({formatFileSize(file.size)})
			</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="flex gap-2">
				<Button onclick={inspectFile} disabled={isLoading}>
					{#if isLoading}
						<div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
					{:else}
						<FileIcon class="h-4 w-4 mr-2" />
					{/if}
					{isLoading ? 'Inspecting...' : 'Inspect File'}
				</Button>
			</div>

			{#if error}
				<div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
					<p class="text-red-800 dark:text-red-200 text-sm">{error}</p>
				</div>
			{/if}

			{#if zipInfo}
				<div class="space-y-4">
					<h3 class="text-lg font-medium flex items-center gap-2">
						<Archive class="h-5 w-5" />
						ZIP Archive Information
					</h3>
					
					<div class="grid grid-cols-2 gap-4">
						<div class="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
							<div class="flex items-center gap-2 mb-1">
								<FileIcon class="h-4 w-4 text-blue-600" />
								<span class="text-sm font-medium text-blue-800 dark:text-blue-200">Total Files</span>
							</div>
							<p class="text-2xl font-bold text-blue-900 dark:text-blue-100">{zipInfo.fileCount}</p>
						</div>
						
						<div class="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
							<div class="flex items-center gap-2 mb-1">
								<Clock class="h-4 w-4 text-green-600" />
								<span class="text-sm font-medium text-green-800 dark:text-green-200">Loading Time</span>
							</div>
							<p class="text-2xl font-bold text-green-900 dark:text-green-100">{zipInfo.loadingTime}ms</p>
						</div>
					</div>
					
					<div class="space-y-2">
						<div class="flex items-center justify-between">
							<span class="text-sm font-medium">Processing Progress</span>
							<span class="text-sm text-gray-600 dark:text-gray-400">{zipInfo.progress}%</span>
						</div>
						<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
							<div 
								class="bg-blue-600 h-2 rounded-full transition-all duration-300" 
								style="width: {zipInfo.progress}%"
							></div>
						</div>
					</div>
					
					{#if zipInfo.jsonFiles.length > 0}
						<div class="space-y-2">
							<h4 class="font-medium flex items-center gap-2">
								<FileJson class="h-4 w-4" />
								JSON Files ({zipInfo.jsonFiles.length})
							</h4>
							<div class="max-h-40 overflow-y-auto space-y-1">
								{#each zipInfo.jsonFiles as jsonFile}
									<div class="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded text-sm">
										<span class="font-mono text-xs">{jsonFile.name}</span>
										<span class="text-gray-500">{formatFileSize(jsonFile.size)}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}

			{#if fileContent}
				<div class="space-y-2">
					<div class="flex items-center justify-between">
						<h3 class="text-lg font-medium">File Content</h3>
						<Button variant="outline" size="sm" onclick={() => {
							const blob = new Blob([fileContent], { type: 'text/plain' });
							const url = URL.createObjectURL(blob);
							const a = document.createElement('a');
							a.href = url;
							a.download = `${file.name}.content.txt`;
							a.click();
							URL.revokeObjectURL(url);
						}}>
							<Download class="h-4 w-4 mr-2" />
							Download
						</Button>
					</div>
					<div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-auto">
						<pre class="text-sm whitespace-pre-wrap break-words">{fileContent}</pre>
					</div>
				</div>
			{/if}
		</CardContent>
	</Card>
{/if}
