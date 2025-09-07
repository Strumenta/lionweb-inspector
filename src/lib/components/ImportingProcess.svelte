<script lang="ts">
	import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
	import { File as FileIcon, Archive, Clock } from '@lucide/svelte';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher<{
		importComplete: { 
			jsonFiles: Array<{ name: string; content: any; size: number }>;
			pbFiles: Array<{ name: string; content: any; size: number; type: 'bulk' | 'chunk' | 'unknown' }>;
		};
	}>();

	let { 
		isOpen = $bindable(false), 
		isLoading = $bindable(false),
		zipInfo = $bindable(null)
	}: {
		isOpen?: boolean;
		isLoading?: boolean;
		zipInfo?: {
			fileCount: number;
			loadingTime: number;
			progress: number;
			jsonFiles: Array<{ name: string; content: any; size: number }>;
			pbFiles: Array<{ name: string; content: any; size: number; type: 'bulk' | 'chunk' | 'unknown' }>;
			totalPartitions?: number;
		} | null;
	} = $props();

	// Watch for completion
	$effect(() => {
		if (zipInfo && zipInfo.progress === 100 && !isLoading) {
			// Import is complete, dispatch event and close modal after a short delay
			setTimeout(() => {
				dispatch('importComplete', {
					jsonFiles: zipInfo.jsonFiles,
					pbFiles: zipInfo.pbFiles
				});
				isOpen = false;
			}, 1000);
		}
	});
</script>

<Dialog bind:open={isOpen}>
	<DialogContent class="max-w-lg">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				<Archive class="h-5 w-5" />
				Importing Process
			</DialogTitle>
			<DialogDescription>
				Processing ZIP archive and extracting LionWeb partitions
			</DialogDescription>
		</DialogHeader>

		{#if isLoading && !zipInfo}
			<div class="flex items-center justify-center py-8">
				<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
				<span class="ml-3">Starting import...</span>
			</div>
		{:else if zipInfo}
			<div class="space-y-6">
				<!-- Total Partitions -->
				<div class="text-center">
					<div class="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
						<div class="flex items-center justify-center gap-2 mb-3">
							<FileIcon class="h-6 w-6 text-blue-600" />
							<span class="text-xl font-medium text-blue-800 dark:text-blue-200">Total Partitions</span>
						</div>
						<p class="text-5xl font-bold text-blue-900 dark:text-blue-100 mb-2">
							{zipInfo.totalPartitions || (zipInfo.jsonFiles.length + zipInfo.pbFiles.length)}
						</p>
						<p class="text-sm text-blue-700 dark:text-blue-300">
							{zipInfo.jsonFiles.length} JSON + {zipInfo.pbFiles.length} Protobuffer
						</p>
					</div>
				</div>

				<!-- Loading Bar -->
				<div class="space-y-4">
					<div class="flex items-center justify-between">
						<span class="text-lg font-medium">Processing Progress</span>
						<span class="text-xl font-bold text-blue-600 dark:text-blue-400">{zipInfo.progress}%</span>
					</div>
					<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-5">
						<div 
							class="bg-gradient-to-r from-blue-500 to-blue-600 h-5 rounded-full transition-all duration-500 ease-out shadow-sm" 
							style="width: {zipInfo.progress}%"
						></div>
					</div>
					<div class="text-center text-sm text-gray-600 dark:text-gray-400">
						Processing partitions...
					</div>
				</div>

				<!-- Loading Time -->
				<div class="text-center">
					<div class="p-6 bg-green-50 dark:bg-green-900/20 rounded-lg">
						<div class="flex items-center justify-center gap-2 mb-3">
							<Clock class="h-6 w-6 text-green-600" />
							<span class="text-xl font-medium text-green-800 dark:text-green-200">Loading Time</span>
						</div>
						<p class="text-4xl font-bold text-green-900 dark:text-green-100">
							{zipInfo.loadingTime < 1000 ? `${zipInfo.loadingTime}ms` : `${(zipInfo.loadingTime / 1000).toFixed(1)}s`}
						</p>
					</div>
				</div>

				{#if zipInfo.progress === 100}
					<div class="text-center py-4">
						<div class="text-green-600 dark:text-green-400 font-medium text-lg">
							✓ Import completed successfully!
						</div>
						<div class="text-sm text-gray-500 mt-2">
							Opening partition viewer...
						</div>
					</div>
				{/if}
			</div>
		{/if}
	</DialogContent>
</Dialog>