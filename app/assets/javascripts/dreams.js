var DN = (function () {
	
	function dreamToListItem(dream) {
		return $('<li id="dream_'+ dream.id +'">'
			+ dream.content + '</li>');
	}
	
	/*  Dream Model */
	function Dream(options) {
		var params = $.extend({
			id: null,
			content: null
		}, options || {});
		this.id = params.id;
		this.content = params.content;
	}
	
	Dream.all = [];
	Dream.callbacks = [];
	Dream.fetchAll = function () {
		$.getJSON(
			"/dreams.json",
			function ( dreamsData ) {
				Dream.all = _(dreamsData).map(function (data) {
					return new Dream(data);
				});
				
				_(Dream.callbacks).each(function (callback) {
					callback();
				});
			}
		);
	};
	
	Dream.find = function(id) {
		return _(Dream.all).find(function (dream) {
			return dream.id == id;
		});
	};
	
	Dream.prototype.save = function() {
		var that = this;
		$.post(
			"/dreams.json",
			that.toJSON(),
			function (savedDream) {
				that.id = savedDream.id;
				Dream.all.push(that);
				console.log(that.id);
				
				_(Dream.callbacks).each(function (callback) {
					console.log('calling callback!');
					callback();
				});
			}
		);
	};
	
	Dream.prototype.toJSON = function () {
		return { dream: {
				 id: this.id,
			content: this.content
		}};
	};
	
	Dream.prototype.update = function() {
		var that = this;
		$.ajax({
			type: "PUT",
			url: "dreams/" + that.id,
			data: that.toJSON(),
			success: function (updatedDream) {
				that.id = updatedDream.id;
				that.content = updatedDream.content;
				
				_(Dream.callbacks).each(function (callback) {
					callback();
				});
			}
		});
	};
	
	/* Individual Dream View */
	function DreamView(element, dream) {
		var that = this;
		that.$element = $(element);
		that.dream = dream;
		that.injectDream();
	}
	
	DreamView.prototype.addEditButtonHandler = function(button) {
		var $form = $('#form')
		var that = this;
		
		button.on('click', function() {
			$form.empty();
			DreamFormView.newDreamForm(that.dream);
		});
	};
	
	DreamView.prototype.injectDream = function() {
		var editButton = $('<button id="dream_'
			+ this.dream.id +'">Edit</button>');
		this.$element.children().last().empty()
			.append($('<p>' + this.dream.content + '</p>'))
			.append(editButton);
		this.addEditButtonHandler(editButton);
	};
	
	/* Dream Index */
	function DreamIndexView (showDreamFunc, element) {
		this.$element = $(element);
		this.installDreamsCallback(false);
		this.showDreamFunc = showDreamFunc;
	}
	
	DreamIndexView.prototype.render = function() {
		//console.log(this.dreams);
		var that = this;
		that.$element.children().last().empty();
		var ul = $('<ul id="all-dreams"></ul>')
		that.bindClick(ul);
		_(that.dreams).each(function (dream) {
			ul.append( $(dreamToListItem(dream)) );
		});
		that.$element.append(ul);
	};
	
	DreamIndexView.prototype.installDreamsCallback = function(loaded) {
		var that = this;
		Dream.callbacks.push(function() {
			that.dreams = Dream.all;
			that.render();
		});
	};
	
	DreamIndexView.prototype.bindClick = function (ul) {
		var that = this;
		var $oneDream = $('#one-dream');
		
		ul.on('click', function (event) {
			ul.off('click');
			var id = $(event.target).prop('id').split('_')[1];
			that.showDreamFunc(Dream.find(id));
			$oneDream.fadeIn();
			$oneDream.fadeOut(4000, function() {
				//DN.DreamFormView.newDreamForm(new DN.Dream()); //make a new dream form
				that.bindClick(ul);
			});
		});
	};
	
	function DreamFormView (element, dream, submitAction, title) {
		this.$element = $(element);
		this.dream = dream;
		this.submitAction = submitAction;
		this.formTitle = title;
		this.injectForm();
	}
	
	DreamFormView.prototype.reset = function() {
		this.dream = new Dream;
		this.formTitle = "Record a Dream";
		this.submitAction = this.dream.save;
		this.$element.empty();
		this.injectForm();
		this.installClickHandler();
	};
	
	//a simple convenience method for generating an update or save form for a dream
	DreamFormView.newDreamForm = function(dream) {
		this.submitAction = dream.id ? dream.update : dream.save;
		this.formTitle = dream.id ? "Update this Dream" : "Record a Dream";
		var $form = $('#form');
		$form.empty();
		var dreamForm = new DN.DreamFormView($form, dream, this.submitAction, this.formTitle);
	};
	
	DreamFormView.prototype.installClickHandler = function (button) {
		var that = this;
		
		$(button).on('click', function() {
			that.dream.content = $('#new-dream-content').val();
			that.submitAction.call(that.dream); //save or update!
			that.reset();
		});
		
		if (this.formTitle.indexOf('Update') !== -1) {
			this.installBlurHandler();
		}
	};
	
	DreamFormView.prototype.installBlurHandler = function() {
		var that = this;
		
		$('#new-dream-content').focus(function() {
			$('#form').on('mouseleave', function() {
				that.reset();
				$('#form').off('mouseleave');
				$('#new-dream-content').off('focus');
			});
		});
	};
	
	DreamFormView.prototype.injectForm = function () {
		var heading = $('<h2 id="form-heading">'+ this.formTitle +'</h2>');
		var submit = $('<button id="new-dream-submit">Save Dream</button>')
		var that = this;
		that.$element.append(heading)
					.append($('<textarea rows="4" cols="50" id="new-dream-content"></textarea>').val(that.dream.content))
					.append(submit);
		that.installClickHandler(submit);
	};
	
	return {
		Dream: Dream,
		DreamView: DreamView,
		DreamIndexView: DreamIndexView,
		DreamFormView: DreamFormView
	};
})();