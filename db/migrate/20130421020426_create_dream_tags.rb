class CreateDreamTags < ActiveRecord::Migration
  def change
    create_table :dream_tags do |t|
      t.integer :dream_id, null: false
      t.integer :tag_id, null: false
      
      t.timestamps
    end
    
    add_index :dream_tags, [:dream_id, :tag_id], unique: true
  end
end
