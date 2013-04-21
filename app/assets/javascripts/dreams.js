var DN = (function() {
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
		this.tags = _(params.tags).map(function(tag) {
			return new Tag(tag);
		});
	}
	
	Dream.all = [];
	Dream.callbacks = [];
	Dream.fetchAll = function() {
		$.getJSON(
			"/dreams.json",
			function( dreamsData ) {
				Dream.all = _(dreamsData).map(function(data) {
					console.log(data);
					return new Dream(data);
				});
				
				_(Dream.callbacks).each(function(callback) {
					callback();
				});
			}
		);
	};
	
	Dream.find = function(id) {
		return _(Dream.all).find(function(dream) {
			return dream.id == id;
		});
	};
	
	Dream.prototype.save = function() {
		var that = this;
		$.post(
			"/dreams.json",
			that.toJSON(),
			function(savedDream) {
				that.id = savedDream.id;
				Dream.all.push(that);
				
				_(Dream.callbacks).each(function(callback) {
					callback();
				});
			}
		);
	};
	
	Dream.prototype.toJSON = function() {
		return { dream: {
				 id: this.id,
			content: this.content,
			tag_ids: _(this.tags).map(function(tag) {
				return (tag.id);
			}) //to save to rails server :)
		}};
	};
	
	Dream.prototype.update = function() {
		var that = this;
		$.ajax({
			type: "PUT",
			url: "dreams/" + that.id,
			data: that.toJSON(),
			success: function(updatedDream) {
				
				_(Dream.callbacks).each(function(callback) {
					callback();
				});
			}
			//better not be no errors!
		});
	};
	
	/* Individual Dream View */
	function DreamView(element, dream) {
		var that = this;
		that.$element = $(element);
		that.dream = dream;
		that.injectDream();
	}
	
	DreamView.prototype.addEditHandler = function() {
		var $form = $('#form')
		var that = this;
		
		that.$element.on('click', function() {
			$form.empty();
			DreamFormView.newDreamForm(that.dream);
		});
	};
	
	DreamView.prototype.injectDream = function() {
		var tagsList = $('<ul class="tag-list"></ul>');
		var dreamContent = $('<p>' + this.dream.content + '</p>');
		_(this.dream.tags).each(function(tag) {
			tagsList.append('<li>'+tag.content+'</li>');
		});
		
		this.$element.empty()
			.append($('<h4>Dream Details</h4>'))
			.append(dreamContent)
			.append($('<h4>Themes</h4>'))
			.append(tagsList);
			
		this.addEditHandler();
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
		_(that.dreams).each(function(dream) {
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
	
	DreamIndexView.prototype.bindClick = function(ul) {
		var that = this;
		var $oneDream = $('#one-dream');
		
		ul.on('click', function(event) {
			ul.off('click');
			var id = $(event.target).prop('id').split('_')[1];
			that.showDreamFunc(Dream.find(id));
			$oneDream.fadeIn();
			$oneDream.fadeOut(6000, function() {
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
		var dreamForm = new DreamFormView($form, dream, this.submitAction, this.formTitle);
	};
	
	DreamFormView.prototype.installClickHandler = function(button) {
		var that = this;
		
		$(button).on('click', function() {
			that.dream.content = $('#new-dream-content').val();
			that.submitAction.call(that.dream); //save or update!
			that.reset();
		});
		
		if (this.formTitle.indexOf('Update') !== -1) {
			this.installFormLeaveHandler();
		}
	};
	
	DreamFormView.prototype.installFormLeaveHandler = function() {
		var that = this;
		
		$('#new-dream-content').focus(function() {
			$('#form').on('mouseleave', function() {
				that.reset();
				$('#form').off('mouseleave');
				$('#new-dream-content').off('focus');
			});
		});
	};
	
	DreamFormView.prototype.addTagToDream = function(tag) {
		var that = this;
		that.dream.tags.push(tag);
		that.tagging.injectTags();
	}
	
	DreamFormView.prototype.injectForm = function() {
		var that = this;
		//templating shtuff
		var heading = $('<h2 id="form-heading">'+ that.formTitle +'</h2>');
		var submit = $('<button id="new-dream-submit">Save Dream</button>');
		var content = $('<textarea rows="4" cols="50" id="new-dream-content"></textarea>')
						.val(that.dream.content);
		
		//hold onto this one, so I can inject tags below

		that.$element.append(heading)
					.append(content)
					.append(submit);
					
		that.tagging =  new Tagging(that);
				
		that.installClickHandler(submit);
	};
	
	function Tag(params) {
		this.id = params.id;
		this.content = params.content;
	}
	
	Tag.all = [];
	Tag.callbacks = [];
	Tag.callbackIndexesToRemove = [];
	
	Tag.fetchAll = function() {
		$.getJSON(
			"/tags.json",
			function(tagsData) {
				Tag.all = _(tagsData).map(function(tagData) {
					return new Tag(tagData);
				});
				
				_(Tag.callbacks).each(function(callback) {
					callback();
				});
			}
		);
	};
	
	Tag.find = function(id) {
		var tags = Tag.all;
		for (var i = 0; i < tags.length; i++) {
			if (tags[i].id === id) {
				return tags[i];
			}
		}
		return -1;
	}

	Tag.prototype.toJSON = function() {
		return { tag: {
				 id: this.id,
			content: this.content }
		};
	}
	
	Tag.prototype.save = function() {
		var that = this;
		$.post(
			"/tags.json",
			that.toJSON(),
			function(savedTag) {
				that.id = savedTag.id;
				Tag.all.push(that);
				
				_(Tag.callbacks).each(function(callback, i) {
					callback(that, i);
				});
				
				_(Tag.callbackIndexesToRemove).each(function(indexOfCallbackToRemove) {
					Tag.callbacks.remove(indexOfCallbackToRemove);
				});
			}
		);
	};
	
	Tagging.callbacks = [];
	
	function Tagging (form) {
		this.form = form;
		this.dream = form.dream;
		this.$element = form.$element;
		this.injectTaggingArea();
		this.installTagCallback();
		this.installKeyListener();
		this.installInputFocusListener();
		this.injectTags(); //in case of an update form
	}
	
	Tagging.prototype.injectTaggingArea = function() {
		var that = this;
		that.$display = $('<div id="tag-display"></div>');
		that.$input = $('<input type="text" id="tagging">').val('Tag with a Theme');
		that.$predictionsArea = $('<div id="tag-predictions"></div>');
		that.form.$element.prepend(that.$display)
							.append(that.$input)
							.append(that.$predictionsArea);
	};
	
	Tagging.prototype.installTagCallback = function() {
		var that = this;
		
		Tag.callbacks = [];
		Tag.callbacks.push(function() {
			that.tags = Tag.all;
		});
		Tag.fetchAll();
	};
	
	Tagging.prototype.installKeyListener = function() {
		var that = this;
		var $input = that.$input;
		
		$input.on('keyup', function(event) {
			var matches = that.findMatches($input.val());
			// console.log(event.keyCode);
			if (event.keyCode === 13) {
				//enter pressed
				var tagToAdd = matches[0];
				if (!tagToAdd) {
					//tag does not exist, create it
					tagToAdd = new Tag({content: $input.val()});
					tagToAdd.save();
					//once tag is saved and has id, add to Dream
					Tag.callbacks.push(function(tag, i) {	
						that.form.addTagToDream(tag);
						Tag.callbackIndexesToRemove.push(i); //haha this is whack!
					});
				} else { //tag already exists, add to dream :)
					that.form.addTagToDream(tagToAdd);
				}
				that.reset();
			} else {
				that.drawMatches(matches);
			}
		});
	};
	
	Tagging.prototype.installInputFocusListener = function() {
		var that = this;
		var $input = that.$input;
		
		if (!$input.val() || $input.val() === 'Tag with a Theme' ) {
		
			$input.val('Tag with a Theme')
			$input.focus(function() {
				$(this).val('');
				$(this).off('focus');
			}).blur(function() {
				if (!$input.val()) {
					$(this).val('Tag with a Theme');
					$(this).off('blur');
					that.installInputFocusListener();
				}
			});
		}
	};
	
	Tagging.prototype.reset = function(){
		this.$input.val('');
		this.$predictionsArea.empty();
	};
	
	Tagging.prototype.findMatches = function(string) {
		var matches = [];
		if (string) {
			_(this.tags).each(function(tag) {
				if ( tag.content.indexOf(string) !== -1 ) {
					// console.log('match found');
					matches.push({
						  id: tag.id, 
					 content: tag.content
				 	});
				}
			});
		}
		return matches;
	};
	
	// Display methods
	Tagging.prototype.injectTags = function() {
		var that = this;
		var ul = $('<ul class="tag-list"></ul>');
		_(that.dream.tags).each(function(tag){
			ul.append($('<li>'+ tag.content +'</li>'));
		});

		that.$display.empty()
						.append($('<h4>tags</h4>'))
						.append(ul);
	};
	
	Tagging.prototype.drawMatches = function(matches) {
		var that = this;
		var ul = $('<ul class="tag-list"></ul>')
		that.$predictionsArea.empty();
		_(matches).each(function(match) {
			ul.append('<li>'+ match.content +'</li>');
		});
		that.$predictionsArea.append(ul);
	};
	
	// Array Remove - By John Resig (MIT Licensed)
	// thanks John!
	Array.prototype.remove = function(from, to) {
	  var rest = this.slice((to || from) + 1 || this.length);
	  this.length = from < 0 ? this.length + from : from;
	  return this.push.apply(this, rest);
	};
	
	return {
		Dream: Dream,
		DreamView: DreamView,
		DreamIndexView: DreamIndexView,
		DreamFormView: DreamFormView,
		Tag: Tag
	};
})();