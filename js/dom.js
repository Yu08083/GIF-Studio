const $ = (id) => document.getElementById(id);

export const dom = {
    tabButtons: () => document.querySelectorAll('.tab-btn'),
    tabPanels:  () => document.querySelectorAll('.tab-panel'),
    presetChips: () => document.querySelectorAll('.preset-chip'),

    gif: {
        dropZone:        $('gif-drop-zone'),
        upload:          $('gif-upload'),
        fileInfo:        $('gif-file-info'),
        compressBtn:     $('compress-btn'),

        progressBox:     $('gif-progress-container'),
        progressBar:     $('gif-progress-bar'),
        progressPct:     $('gif-progress-percent'),
        progressText:    $('gif-progress-text'),

        status:          $('gif-status'),

        result:          $('gif-result'),
        originalSize:    $('gif-original-size'),
        compressedSize: $('gif-compressed-size'),
        usageFill:       $('gif-usage-fill'),
        usageText:       $('gif-usage-text'),
        originalImg:     $('gif-original'),
        compressedImg:   $('gif-compressed'),
        downloadLink:    $('gif-download'),
    },

    video: {
        dropZone:        $('video-drop-zone'),
        upload:          $('video-upload'),
        fileInfo:        $('video-file-info'),

        editor:          $('video-editor'),
        preview:         $('video-preview'),

        trimStart:       $('trim-start'),
        trimEnd:         $('trim-end'),
        trimStartDisp:   $('trim-start-display'),
        trimEndDisp:     $('trim-end-display'),
        trimDuration:    $('trim-duration'),

        fps:             $('video-fps'),
        width:           $('video-width'),
        quality:         $('video-quality'),
        optimize:        $('video-optimize'),
        dither:          $('video-dither'),

        convertBtn:      $('convert-btn'),

        progressBox:     $('video-progress-container'),
        progressBar:     $('video-progress-bar'),
        progressPct:     $('video-progress-percent'),
        progressLabel:   $('video-progress-label'),

        status:          $('video-status'),

        result:          $('video-result'),
        outputSize:      $('video-output-size'),
        outputInfo:      $('video-output-info'),
        usageFill:       $('video-usage-fill'),
        usageText:       $('video-usage-text'),
        outputImg:       $('video-output-gif'),
        downloadLink:    $('video-download'),
    },
};
