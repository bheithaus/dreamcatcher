class DreamTag < ActiveRecord::Base
  attr_accessible :dream_id, :tag_id
  
  belongs_to :dream
  belongs_to :tag
  
  validates :dream_id, :tag_id, presence: true
end
