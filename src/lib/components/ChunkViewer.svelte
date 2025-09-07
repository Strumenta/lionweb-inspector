<script lang="ts">
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { FileJson, Database, File as FileIcon, Archive } from '@lucide/svelte';
	import { ProperChunkViewer } from '$lib/components';
    import { PBChunk } from '$lib/proto';

	let { 
		jsonFiles = [],
		pbFiles = []
	}: {
		jsonFiles?: Array<{ name: string; content: any; size: number }>;
		pbFiles?: Array<{ name: string; content: any; size: number; type: 'bulk' | 'chunk' | 'unknown' }>;
	} = $props();

	let selectedChunk: { name: string; content: any; type: 'json' | 'pb'; size: number; pbType?: string } | null = $state(null);
	let protobufferView: 'raw' | 'chunk' | 'loaded' = $state('raw');

	// Combine all chunks into a single list
	function getAllChunks() {
		const chunks: Array<{ name: string; content: any; type: 'json' | 'pb'; size: number; pbType?: string }> = [];
		
		jsonFiles.forEach(file => {
			chunks.push({
				name: file.name,
				content: file.content,
				type: 'json',
				size: file.size
			});
		});
		
		pbFiles.forEach(file => {
			chunks.push({
				name: file.name,
				content: file.content,
				type: 'pb',
				size: file.size,
				pbType: file.type
			});
		});
		
		return chunks;
	}

	function selectChunk(chunk: ReturnType<typeof getAllChunks>[0]) {
		selectedChunk = chunk;
		// Reset protobuffer view to raw when selecting a new chunk
		protobufferView = 'raw';
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	}

	function getChunkIcon(chunk: ReturnType<typeof getAllChunks>[0]) {
		if (chunk.type === 'json') return FileJson;
		return Database;
	}
</script>

<div class="flex h-full">
	<!-- Left Sidebar - Chunk List -->
	<div class="w-80 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
		<div class="p-4 border-b border-gray-200 dark:border-gray-700">
			<h2 class="text-lg font-semibold">Chunks ({getAllChunks().length})</h2>
			<p class="text-sm text-gray-600 dark:text-gray-400">Select a chunk to view</p>
		</div>
		
		<div class="overflow-y-auto h-full">
			<div class="p-2 space-y-1">
				{#each getAllChunks() as chunk}
					{@const IconComponent = getChunkIcon(chunk)}
					<Button
						variant={selectedChunk?.name === chunk.name ? "default" : "ghost"}
						class="w-full justify-start h-auto p-3"
						onclick={() => selectChunk(chunk)}
					>
						<div class="flex items-center gap-3 w-full">
							<IconComponent class="h-4 w-4 flex-shrink-0" />
							<div class="flex-1 min-w-0">
								<div class="font-medium text-sm truncate">{chunk.name}</div>
								<div class="text-xs text-gray-500 flex items-center gap-2">
									<span>{formatFileSize(chunk.size)}</span>
									{#if chunk.type === 'pb' && chunk.pbType}
										<span class="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
											{chunk.pbType}
										</span>
									{/if}
								</div>
							</div>
						</div>
					</Button>
				{/each}
			</div>
		</div>
	</div>

	<!-- Main Content Area -->
	<div class="flex-1 flex flex-col">
		{#if selectedChunk}
			<div class="p-6">
				<Card>
					<CardHeader>
						{#if selectedChunk}
							{@const IconComponent = getChunkIcon(selectedChunk)}
							<CardTitle class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<IconComponent class="h-5 w-5" />
									{selectedChunk.name}
								</div>
								<div class="flex items-center gap-3">
									<span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
										{selectedChunk.type === 'json' ? 'JSON' : 'Protobuffer'}
									</span>
									<span class="text-xs text-gray-500 dark:text-gray-400">
										{formatFileSize(selectedChunk.size)}
									</span>
								</div>
							</CardTitle>
							<CardDescription>
								{selectedChunk.type === 'json' ? 'JSON Chunk' : 'Protobuffer Chunk'} • {formatFileSize(selectedChunk.size)}
								{#if selectedChunk.type === 'pb' && selectedChunk.pbType}
									• {selectedChunk.pbType}
								{/if}
							</CardDescription>
						{/if}
					</CardHeader>
					<CardContent>
						<div class="space-y-4">
							<!-- Content Preview -->
							<div class="space-y-4">
								<div class="flex items-center justify-between">
									<h3 class="text-lg font-medium">Content Preview</h3>
									{#if selectedChunk.type === 'pb'}
										<div class="flex gap-2">
											<Button 
												variant={protobufferView === 'raw' ? 'default' : 'outline'}
												size="sm"
												onclick={() => protobufferView = 'raw'}
											>
												Raw
											</Button>
											<Button 
												variant={protobufferView === 'chunk' ? 'default' : 'outline'}
												size="sm"
												onclick={() => protobufferView = 'chunk'}
											>
												Chunk
											</Button>
											<Button 
												variant={protobufferView === 'loaded' ? 'default' : 'outline'}
												size="sm"
												onclick={() => protobufferView = 'loaded'}
											>
												Loaded
											</Button>
										</div>
									{/if}
								</div>
								
								<div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-auto">
									{#if selectedChunk.type === 'json'}
										<pre class="text-sm whitespace-pre-wrap break-words">{JSON.stringify(selectedChunk.content, null, 2)}</pre>
									{:else if selectedChunk.type === 'pb'}
										{#if protobufferView === 'raw'}
											<pre class="text-sm whitespace-pre-wrap break-words">{JSON.stringify(selectedChunk.content, null, 2)}</pre>
										{:else if protobufferView === 'chunk'}
											<div class="text-center py-8">
												 <ProperChunkViewer pbChunk={selectedChunk.content as PBChunk} />
											</div>
										{:else if protobufferView === 'loaded'}
											<div class="text-center py-8">
												<div class="text-gray-500 dark:text-gray-400">
													<h4 class="text-lg font-medium mb-2">Loaded View</h4>
													<p>To be implemented</p>
												</div>
											</div>
										{/if}
									{/if}
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		{:else}
			<div class="flex-1 flex items-center justify-center">
				<div class="text-center">
					<Archive class="h-16 w-16 mx-auto text-gray-400 mb-4" />
					<h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Chunk Selected</h3>
					<p class="text-gray-600 dark:text-gray-400">Choose a chunk from the sidebar to view its contents</p>
				</div>
			</div>
		{/if}
	</div>
</div>
