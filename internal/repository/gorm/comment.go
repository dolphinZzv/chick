package gorm

import (
	"morning-glory/internal/models"
	"morning-glory/internal/repository"

	"gorm.io/gorm"
)

type CommentRepo struct {
	db *gorm.DB
}

func NewCommentRepo(db *gorm.DB) repository.CommentRepository {
	return &CommentRepo{db: db}
}

func (r *CommentRepo) Create(comment *models.Comment) error {
	return r.db.Create(comment).Error
}

func (r *CommentRepo) GetByID(id uint) (*models.Comment, error) {
	var c models.Comment
	err := r.db.Preload("Author").First(&c, id).Error
	return &c, err
}

func (r *CommentRepo) orderDir(asc bool) string {
	if asc {
		return "ASC"
	}
	return "DESC"
}

func (r *CommentRepo) ListByIssue(issueID uint, asc bool) ([]models.Comment, error) {
	var list []models.Comment
	err := r.db.Where("issue_id = ?", issueID).
		Order("created_at " + r.orderDir(asc)).
		Preload("Author").
		Preload("Replies").
		Preload("Replies.Author").
		Find(&list).Error
	return list, err
}

func (r *CommentRepo) ListByProposal(proposalID uint, asc bool) ([]models.Comment, error) {
	var list []models.Comment
	err := r.db.Where("proposal_id = ?", proposalID).
		Order("created_at " + r.orderDir(asc)).
		Preload("Author").
		Preload("Replies").
		Preload("Replies.Author").
		Find(&list).Error
	return list, err
}

func (r *CommentRepo) ListByTask(taskID uint, asc bool) ([]models.Comment, error) {
	var list []models.Comment
	err := r.db.Where("task_id = ?", taskID).
		Order("created_at " + r.orderDir(asc)).
		Preload("Author").
		Preload("Replies").
		Preload("Replies.Author").
		Find(&list).Error
	return list, err
}

func (r *CommentRepo) ListByParent(parentID uint, asc bool) ([]models.Comment, error) {
	var list []models.Comment
	err := r.db.Where("parent_id = ?", parentID).
		Order("created_at " + r.orderDir(asc)).
		Preload("Author").
		Find(&list).Error
	return list, err
}

func (r *CommentRepo) Update(id uint, body string) error {
	return r.db.Model(&models.Comment{}).Where("id = ?", id).
		Update("body", body).Error
}

func (r *CommentRepo) Delete(id uint) error {
	return r.db.Delete(&models.Comment{}, id).Error
}
