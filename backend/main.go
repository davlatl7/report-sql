package main

import (
	"encoding/csv"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type ReportTemplate struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Name      string    `json:"name"`
	SQL       string    `json:"sql"`
	Columns   []string  `json:"columns" gorm:"-"`
	Filters   []Filter  `json:"filters" gorm:"-"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Filter struct {
	Field    string      `json:"field"`
	Operator string      `json:"operator"`
	Value    interface{} `json:"value"`
	Type     string      `json:"type"` // text, number, date, enum
}

type ColumnInfo struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Nullable bool   `json:"nullable"`
}

type QueryRequest struct {
	Columns   []string `json:"columns"`
	Filters   []Filter `json:"filters"`
	SQL       string   `json:"sql"`
	Page      int      `json:"page"`
	PageSize  int      `json:"pageSize"`
	SortBy    string   `json:"sortBy"`
	SortOrder string   `json:"sortOrder"`
	Search    string   `json:"search"`
	TableName string   `json:"tableName"` // Added for runQuery
}

type QueryResponse struct {
	Data       []map[string]interface{} `json:"data"`
	Total      int64                    `json:"total"`
	Page       int                      `json:"page"`
	PageSize   int                      `json:"pageSize"`
	TotalPages int                      `json:"totalPages"`
}

type TableInfo struct {
	Name    string       `json:"name"`
	Columns []ColumnInfo `json:"columns"`
}

var db *gorm.DB

func initDB() {
	dsn := "host=localhost user=postgres password=davlat1234 dbname=reportdb port=5432 sslmode=disable"
	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("failed to connect database: ", err)
	}
	db = database
	db.AutoMigrate(&ReportTemplate{})
}

func getTables(c *gin.Context) {
	var tables []TableInfo

	// Получаем список таблиц
	var tableNames []string
	db.Raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'").Scan(&tableNames)

	for _, tableName := range tableNames {
		table := TableInfo{Name: tableName}

		// Получаем информацию о колонках
		var columns []ColumnInfo
		db.Raw(`
			SELECT 
				column_name as name,
				data_type as type,
				is_nullable = 'YES' as nullable
			FROM information_schema.columns 
			WHERE table_name = ? AND table_schema = 'public'
			ORDER BY ordinal_position
		`, tableName).Scan(&columns)

		table.Columns = columns
		tables = append(tables, table)
	}

	c.JSON(http.StatusOK, tables)
}

func getTableColumns(c *gin.Context) {
	tableName := c.Param("table")
	if tableName == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Table name is required"})
		return
	}

	var columns []ColumnInfo
	db.Raw(`
		SELECT 
			column_name as name,
			data_type as type,
			is_nullable = 'YES' as nullable
		FROM information_schema.columns 
		WHERE table_name = ? AND table_schema = 'public'
		ORDER BY ordinal_position
	`, tableName).Scan(&columns)

	c.JSON(http.StatusOK, columns)
}

func generateSQL(columns []string, filters []Filter, tableName string, page, pageSize int, sortBy, sortOrder string) string {
	// Базовый запрос
	query := "SELECT "
	if len(columns) > 0 {
		query += strings.Join(columns, ", ")
	} else {
		query += "*"
	}

	query += " FROM " + tableName + " WHERE 1=1"

	// Добавляем фильтры
	for _, filter := range filters {
		query += buildFilterCondition(filter)
	}

	// Добавляем сортировку
	if sortBy != "" {
		query += " ORDER BY " + sortBy
		if sortOrder == "desc" {
			query += " DESC"
		} else {
			query += " ASC"
		}
	}

	// Добавляем пагинацию
	if pageSize > 0 {
		offset := (page - 1) * pageSize
		query += fmt.Sprintf(" LIMIT %d OFFSET %d", pageSize, offset)
	}

	return query
}

func buildFilterCondition(filter Filter) string {
	field := filter.Field
	operator := filter.Operator
	value := filter.Value

	switch operator {
	case "=", ">", "<", ">=", "<=", "!=":
		return fmt.Sprintf(" AND %s %s %v", field, operator, value)
	case "LIKE":
		return fmt.Sprintf(" AND %s LIKE '%%%v%%'", field, value)
	case "IN":
		if arr, ok := value.([]interface{}); ok {
			values := make([]string, len(arr))
			for i, v := range arr {
				values[i] = fmt.Sprintf("'%v'", v)
			}
			return fmt.Sprintf(" AND %s IN (%s)", field, strings.Join(values, ","))
		}
		return ""
	case "BETWEEN":
		if arr, ok := value.([]interface{}); ok && len(arr) == 2 {
			return fmt.Sprintf(" AND %s BETWEEN %v AND %v", field, arr[0], arr[1])
		}
		return ""
	default:
		return ""
	}
}

func runQuery(c *gin.Context) {
	var req QueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Устанавливаем значения по умолчанию
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 50
	}
	if req.SortOrder == "" {
		req.SortOrder = "asc"
	}

	tableName := req.TableName
	if tableName == "" {
		db.Raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 1").Scan(&tableName)
	}

	sqlQuery := req.SQL
	if sqlQuery == "" {
		// Если columns пустой, явно подставить *
		columns := req.Columns
		if len(columns) == 0 {
			columns = []string{"*"}
		}
		sqlQuery = generateSQL(columns, req.Filters, tableName, req.Page, req.PageSize, req.SortBy, req.SortOrder)
	}

	// Получаем общее количество записей (без GROUP BY и агрегатов)
	countQuery := ""
	if strings.Contains(sqlQuery, "GROUP BY") || strings.Contains(sqlQuery, "SUM(") || strings.Contains(sqlQuery, "COUNT(") || strings.Contains(sqlQuery, "AVG(") {
		// Не строим countQuery для агрегатных запросов
		countQuery = ""
	} else {
		countQuery = "SELECT COUNT(*) FROM " + tableName + " WHERE 1=1"
		for _, filter := range req.Filters {
			countQuery += buildFilterCondition(filter)
		}
	}

	var total int64 = 0
	if countQuery != "" {
		db.Raw(countQuery).Scan(&total)
	}

	// Выполняем основной запрос
	var results []map[string]interface{}
	tx := db.Raw(sqlQuery).Scan(&results)
	if tx.Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": tx.Error.Error()})
		return
	}

	totalPages := 1
	if req.PageSize > 0 && total > 0 {
		totalPages = int((total + int64(req.PageSize) - 1) / int64(req.PageSize))
	}

	response := QueryResponse{
		Data:       results,
		Total:      total,
		Page:       req.Page,
		PageSize:   req.PageSize,
		TotalPages: totalPages,
	}

	c.JSON(http.StatusOK, response)
}

func saveTemplate(c *gin.Context) {
	var tmpl ReportTemplate
	if err := c.ShouldBindJSON(&tmpl); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	db.Save(&tmpl)
	c.JSON(http.StatusOK, tmpl)
}

func getTemplates(c *gin.Context) {
	var templates []ReportTemplate
	db.Find(&templates)
	c.JSON(http.StatusOK, templates)
}

func deleteTemplate(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Template ID is required"})
		return
	}

	var template ReportTemplate
	if err := db.First(&template, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Template not found"})
		return
	}

	db.Delete(&template)
	c.JSON(http.StatusOK, gin.H{"message": "Template deleted successfully"})
}

func exportToCSV(c *gin.Context) {
	var req QueryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sqlQuery := req.SQL
	if sqlQuery == "" {
		var tableName string
		db.Raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' LIMIT 1").Scan(&tableName)
		sqlQuery = generateSQL(req.Columns, req.Filters, tableName, 1, 10000, "", "") // Экспортируем все данные
	}

	var results []map[string]interface{}

	tx := db.Raw(sqlQuery).Scan(&results)
	if tx.Error != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": tx.Error.Error()})
		return
	}

	filename := fmt.Sprintf("report_%d.csv", time.Now().Unix())
	file, err := os.Create(filename)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create file"})
		return
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	if len(results) > 0 {
		head := []string{}
		for k := range results[0] {
			head = append(head, k)
		}
		writer.Write(head)
		for _, row := range results {
			record := []string{}
			for _, k := range head {
				val := fmt.Sprintf("%v", row[k])
				record = append(record, val)
			}
			writer.Write(record)
		}
	}

	c.FileAttachment(filename, filename)
}

func main() {
	initDB()
	r := gin.Default()

	// Настройка CORS
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"http://localhost:3000"}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	r.Use(cors.New(config))

	// API endpoints
	r.GET("/api/tables", getTables)
	r.GET("/api/tables/:table/columns", getTableColumns)
	r.POST("/api/query", runQuery)
	r.GET("/api/templates", getTemplates)
	r.POST("/api/templates", saveTemplate)
	r.DELETE("/api/templates/:id", deleteTemplate)
	r.POST("/api/export", exportToCSV)

	srv := &http.Server{
		Addr:         ":8080",
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  30 * time.Second,
	}

	log.Println("Server running at http://localhost:8080")
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("listen: %s\n", err)
	}
}
