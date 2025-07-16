package com.reconciliation.model;

public class ReconciliationProgress {
    private int progress; // 0-100
    private String step;
    private int currentFile;
    private int totalFiles;

    public ReconciliationProgress() {}

    public ReconciliationProgress(int progress, String step, int currentFile, int totalFiles) {
        this.progress = progress;
        this.step = step;
        this.currentFile = currentFile;
        this.totalFiles = totalFiles;
    }

    public int getProgress() { return progress; }
    public void setProgress(int progress) { this.progress = progress; }

    public String getStep() { return step; }
    public void setStep(String step) { this.step = step; }

    public int getCurrentFile() { return currentFile; }
    public void setCurrentFile(int currentFile) { this.currentFile = currentFile; }

    public int getTotalFiles() { return totalFiles; }
    public void setTotalFiles(int totalFiles) { this.totalFiles = totalFiles; }
} 