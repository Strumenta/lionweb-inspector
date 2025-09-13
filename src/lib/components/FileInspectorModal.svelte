<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import JSZip from 'jszip';

	const dispatch = createEventDispatcher<{
		progress: { zipInfo: any };
		complete: { 
			jsonFiles: Array<{ name: string; content: any; size: number }>;
			pbFiles: Array<{ name: string; content: any; size: number; type: 'bulk' | 'chunk' | 'unknown' }>;
		};
	}>();

	let { 
		file = null,
		fileType = null
	}: {
		file?: File | null;
		fileType?: 'zip' | 'single' | null;
	} = $props();

	let zipInfo = $state<{
		fileCount: number;
		loadingTime: number;
		progress: number;
		jsonFiles: Array<{ name: string; content: any; size: number }>;
		pbFiles: Array<{ name: string; content: any; size: number; type: 'bulk' | 'chunk' | 'unknown' }>;
		totalPartitions?: number;
	} | null>(null);
	let startTime = $state<number>(0);

	async function inspectFile() {
		if (!file) return;
		
		zipInfo = null;
		startTime = Date.now();
		
		try {
			if (fileType === 'zip') {
				await inspectZipFile();
			} else {
				throw new Error('Only ZIP files are supported. Please upload a ZIP archive containing LionWeb JSON chunks or protobuffer files.');
			}
		} catch (err) {
			console.error('Failed to inspect file:', err);
		}
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
		const pbFiles = allFiles.filter(fileName => fileName.toLowerCase().endsWith('.binpb'));
		
		// Initialize ZIP info
		zipInfo = {
			fileCount: allFiles.length,
			loadingTime: 0,
			progress: 0,
			jsonFiles: [],
			pbFiles: [],
			totalPartitions: jsonFiles.length + pbFiles.length
		};
		
		// Dispatch initial state
		dispatch('progress', { zipInfo });
		
		// Process files (JSON and protobuffer)
		let processedCount = 0;
		const totalFiles = jsonFiles.length + pbFiles.length;
		
		// Process JSON files
		for (const fileName of jsonFiles) {
			try {
				const zipFile = zipContents.files[fileName];
				if (!zipFile.dir) {
					const content = await zipFile.async('text');
					const jsonContent = JSON.parse(content);
					
					zipInfo!.jsonFiles.push({
						name: fileName,
						content: jsonContent,
						size: content.length
					});
				}
			} catch (err) {
				console.warn(`Failed to parse JSON file ${fileName}:`, err);
			}
			
			processedCount++;
			zipInfo!.progress = Math.round((processedCount / totalFiles) * 100);
			zipInfo!.loadingTime = Date.now() - startTime;
			dispatch('progress', { zipInfo });
		}
		
		// Process protobuffer files
		for (const fileName of pbFiles) {
			try {
				const zipFile = zipContents.files[fileName];
				if (!zipFile.dir) {
					const content = await zipFile.async('uint8array');
					
					// Try to parse as BulkImport first, then as Chunk
					let pbContent: any;
					let pbType: 'bulk' | 'chunk' | 'unknown';
					
					try {
						// Dynamic import to avoid SSR issues
						const { PBBulkImport } = await import('$lib/proto/BulkImport.js');
						pbContent = PBBulkImport.decode(content);
						pbType = 'bulk';
					} catch (bulkErr) {
						try {
							const { PBChunk } = await import('$lib/proto/Chunk.js');
							pbContent = PBChunk.decode(content);
							pbType = 'chunk';
						} catch (chunkErr) {
							// If protobuffer parsing fails, store as raw binary data
							console.warn(`Failed to parse protobuffer file ${fileName} as either BulkImport or Chunk:`, bulkErr, chunkErr);
							pbContent = {
								error: 'Failed to parse protobuffer',
								rawSize: content.length,
								bulkError: bulkErr instanceof Error ? bulkErr.message : String(bulkErr),
								chunkError: chunkErr instanceof Error ? chunkErr.message : String(chunkErr)
							};
							pbType = 'unknown';
						}
					}
					
					zipInfo!.pbFiles.push({
						name: fileName,
						content: pbContent,
						size: content.length,
						type: pbType
					});
				}
			} catch (err) {
				console.warn(`Failed to parse protobuffer file ${fileName}:`, err);
			}
			
			processedCount++;
			zipInfo!.progress = Math.round((processedCount / totalFiles) * 100);
			zipInfo!.loadingTime = Date.now() - startTime;
			dispatch('progress', { zipInfo });
		}
		
		// Update loading time
		zipInfo!.loadingTime = Date.now() - startTime;
		
		// Dispatch completion
		dispatch('complete', {
			jsonFiles: zipInfo!.jsonFiles,
			pbFiles: zipInfo!.pbFiles
		});
	}

	// Watch for file changes and auto-inspect
	$effect(() => {
		if (file && fileType === 'zip') {
			inspectFile();
		}
	});
</script>
