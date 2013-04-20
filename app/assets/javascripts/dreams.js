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
				
				_(Dream.callbacks).each(function (callback) {
					callback(savedDream);
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
					callback(updatedDream);
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
			new DreamFormView($form, that.dream, that.dream.update, "Update Dream Details");
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
		this.showDreamFunc = showDreamFunc
	}
	
	DreamIndexView.prototype.refresh = function() {
		var that = this;
		that.$element.children().last().empty();
		that.render();
	};
	
	DreamIndexView.prototype.render = function() {
		console.log(this.dreams);
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
			if (!loaded) {
				that.render();
				loaded = true;
			}
		});
	};
	
	DreamIndexView.prototype.bindClick = function (ul) {
		var that = this;
		ul.on('click', function (event) {
			ul.off('click');
			console.log($(event.target).children());
			var id = $(event.target).prop('id').split('_')[1];
			that.showDreamFunc(Dream.find(id));
			$('#one-dream').fadeIn();
			$('#one-dream').fadeOut(4000, function() {
				that.bindClick(ul);
			});
		});
	};
	
	function DreamFormView (element, dream, submitAction, title) {
		this.$element = $(element);
		this.dream = dream;
		this.submitAction = submitAction;
		this.title = title;
		this.injectForm();
	}
	
	DreamFormView.prototype.installClickHandler = function (button) {
		var that = this;
		
		//MOVE THIS!!!
		
		Dream.callbacks.push(function (savedDream) {
			if (savedDream) {
				$('#new-dream-content').val('');
				new DN.DreamFormView($('form'), newDream, newDream.save, "Record a Dream");
				$('#all-dreams').append( $(dreamToListItem(savedDream)) );
			}
		});
		$(button).on('click', function() {
			that.dream.content = $('#new-dream-content').val();
			that.submitAction.call(that.dream);
		});
	};
	
	DreamFormView.prototype.injectForm = function () {
		var heading = $('<h2>'+ this.title +'</h2>');
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