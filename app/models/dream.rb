class Dream < ActiveRecord::Base
  attr_accessible :content, :tag_ids
  
  has_many :dream_tags, dependent: :delete_all
  has_many :tags, through: :dream_tags
  
  accepts_nested_attributes_for :dream_tags
  
  validates :content, presence: true
end
