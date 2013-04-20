class DreamsController < ApplicationController
  def index
    @dreams = Dream.all
    
    respond_to do |format|
      format.html { render :index }
      format.json { render :json => @dreams }
    end
  end
  
  def show
    @dream = Dream.find(params[:id])
    
    respond_to do |format|
      format.json { render :json => @dream }
    end
  end
  
  def create
    @dream = Dream.create!(params[:dream])
    
    respond_to do |format|
      format.json { render :json => @dream }
    end
  end
  
  def update
    @dream = Dream.find(params[:id])
    
    @dream.update_attributes(params[:dream])
    
    respond_to do |format|
      format.json { render :json => @dream }
    end
  end
end
