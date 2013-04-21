class Tag < ActiveRecord::Base
  attr_accessible :content
  
  has_many :dream_tags, dependent: :delete_all
  has_many :dreams, through: :dream_tags
  
  validates :content, presence: true, uniqueness: true
end
