class TagsController < ApplicationController
  def index
    @tags = Tag.all
    
    respond_to do |format|
      format.json { render json: @tags }
    end
  end
  
  def create
    @tag = Tag.create!(params[:tag])
    
    respond_to do |format|
      format.json { render json: @tag }
    end
  end
end
