class CreateDreams < ActiveRecord::Migration
  def change
    create_table :dreams do |t|
      t.text :content
      
      t.timestamps
    end
  end
end
