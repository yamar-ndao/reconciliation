package com.reconciliation.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.poi.hssf.usermodel.HSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.*;

@Service
@Slf4j
public class ExcelParsingService {

    /**
     * Parse un fichier Excel et retourne les données sous forme de liste de maps
     * Chaque map représente une ligne avec les noms de colonnes comme clés
     */
    public List<Map<String, String>> parseExcelFile(MultipartFile file) throws Exception {
        String filename = file.getOriginalFilename();
        if (filename == null) {
            throw new IllegalArgumentException("Nom de fichier invalide");
        }
        
        String lowerFilename = filename.toLowerCase();
        log.info("🔄 Parsing fichier Excel: {} ({} MB)", filename, file.getSize() / (1024 * 1024));
        
        try (InputStream is = file.getInputStream(); Workbook workbook = createWorkbook(lowerFilename, is)) {
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                throw new IllegalArgumentException("Aucune feuille trouvée dans le fichier Excel");
            }
            
            // Détecter la ligne d'en-tête
            int headerRowIndex = findHeaderRow(sheet);
            Row headerRow = sheet.getRow(headerRowIndex);
            
            if (headerRow == null) {
                throw new IllegalArgumentException("Aucune ligne d'en-tête trouvée");
            }
            
            // Extraire les en-têtes
            List<String> headers = extractHeaders(headerRow);
            log.info("📊 En-têtes détectés: {} colonnes", headers.size());
            
            // Lire toutes les lignes de données
            List<Map<String, String>> data = new ArrayList<>();
            int lastRowNum = sheet.getLastRowNum();
            int dataStartRow = headerRowIndex + 1;
            
            log.info("📊 Lecture de {} lignes de données...", lastRowNum - headerRowIndex);
            
            for (int rowIndex = dataStartRow; rowIndex <= lastRowNum; rowIndex++) {
                Row row = sheet.getRow(rowIndex);
                if (row == null) continue;
                
                Map<String, String> rowData = new HashMap<>();
                boolean hasData = false;
                
                for (int colIndex = 0; colIndex < headers.size(); colIndex++) {
                    Cell cell = row.getCell(colIndex);
                    String value = getCellValueAsString(cell);
                    
                    if (value != null && !value.trim().isEmpty()) {
                        hasData = true;
                    }
                    
                    rowData.put(headers.get(colIndex), value != null ? value : "");
                }
                
                // Ne pas ajouter les lignes complètement vides
                if (hasData) {
                    data.add(rowData);
                }
                
                // Log de progression tous les 100k lignes
                if (rowIndex % 100000 == 0) {
                    log.info("📊 Progression: {} lignes lues...", rowIndex - headerRowIndex);
                }
            }
            
            log.info("✅ Parsing terminé: {} lignes de données extraites", data.size());
            return data;
            
        } catch (Exception e) {
            log.error("❌ Erreur lors du parsing du fichier Excel: {}", e.getMessage(), e);
            throw e;
        }
    }
    
    private Workbook createWorkbook(String filename, InputStream is) throws Exception {
        if (filename.endsWith(".xlsx") || filename.endsWith(".xlsm")) {
            return new XSSFWorkbook(is);
        } else if (filename.endsWith(".xls")) {
            return new HSSFWorkbook(is);
        } else {
            throw new IllegalArgumentException("Format de fichier non supporté: " + filename);
        }
    }
    
    private int findHeaderRow(Sheet sheet) {
        // Chercher la ligne d'en-tête dans les 20 premières lignes
        for (int i = 0; i < Math.min(20, sheet.getLastRowNum() + 1); i++) {
            Row row = sheet.getRow(i);
            if (row == null) continue;
            
            // Vérifier si cette ligne ressemble à un en-tête
            if (isHeaderRow(row)) {
                log.info("✅ Ligne d'en-tête trouvée à la ligne {}", i + 1);
                return i;
            }
        }
        
        // Si aucune ligne d'en-tête trouvée, utiliser la première ligne
        log.warn("⚠️ Aucune ligne d'en-tête détectée, utilisation de la première ligne");
        return 0;
    }
    
    private boolean isHeaderRow(Row row) {
        int nonEmptyCells = 0;
        int textCells = 0;
        
        for (int i = row.getFirstCellNum(); i < row.getLastCellNum(); i++) {
            Cell cell = row.getCell(i);
            if (cell != null) {
                String value = getCellValueAsString(cell);
                if (value != null && !value.trim().isEmpty()) {
                    nonEmptyCells++;
                    // Les en-têtes sont généralement du texte
                    if (cell.getCellType() == CellType.STRING) {
                        textCells++;
                    }
                }
            }
        }
        
        // Une ligne d'en-tête a généralement au moins 3 cellules non vides
        // et la majorité sont du texte
        return nonEmptyCells >= 3 && (textCells * 2 >= nonEmptyCells);
    }
    
    private List<String> extractHeaders(Row headerRow) {
        List<String> headers = new ArrayList<>();
        
        for (int i = headerRow.getFirstCellNum(); i < headerRow.getLastCellNum(); i++) {
            Cell cell = headerRow.getCell(i);
            String header = getCellValueAsString(cell);
            
            if (header == null || header.trim().isEmpty()) {
                header = "Colonne_" + (i + 1);
            } else {
                header = normalizeHeader(header.trim());
            }
            
            headers.add(header);
        }
        
        return headers;
    }
    
    private String normalizeHeader(String header) {
        // Normaliser les en-têtes (supprimer accents, espaces multiples, etc.)
        return header
            .toLowerCase()
            .replaceAll("\\s+", "_")
            .replaceAll("[^a-z0-9_]", "");
    }
    
    private String getCellValueAsString(Cell cell) {
        if (cell == null) {
            return null;
        }
        
        switch (cell.getCellType()) {
            case STRING:
                return cell.getStringCellValue();
            case NUMERIC:
                if (DateUtil.isCellDateFormatted(cell)) {
                    return cell.getDateCellValue().toString();
                } else {
                    // Formater les nombres sans décimales inutiles
                    double numValue = cell.getNumericCellValue();
                    if (numValue == (long) numValue) {
                        return String.valueOf((long) numValue);
                    } else {
                        return String.valueOf(numValue);
                    }
                }
            case BOOLEAN:
                return String.valueOf(cell.getBooleanCellValue());
            case FORMULA:
                try {
                    // Essayer d'obtenir la valeur calculée
                    switch (cell.getCachedFormulaResultType()) {
                        case STRING:
                            return cell.getStringCellValue();
                        case NUMERIC:
                            double numValue = cell.getNumericCellValue();
                            if (numValue == (long) numValue) {
                                return String.valueOf((long) numValue);
                            } else {
                                return String.valueOf(numValue);
                            }
                        case BOOLEAN:
                            return String.valueOf(cell.getBooleanCellValue());
                        default:
                            return cell.getCellFormula();
                    }
                } catch (Exception e) {
                    return cell.getCellFormula();
                }
            case BLANK:
                return null;
            default:
                return null;
        }
    }
}

