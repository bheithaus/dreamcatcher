var DN = (function() {
	function dreamToListItem(dream) {
		return $('<li><a class="delete">x</a> <a class="lizzy" href="#">'
				+ dream.content +
				'</a></li>')
				.data('id', dream.id);
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
	
	var deleteDreamFromAll = function(id) {
		var indexToDelete = -1;
		for (var i = 0; i < Dream.all.length; i++) {
			if (Dream.all[i].id === id) {
				indexToDelete = i;
				break;
			}
		}
		if (indexToDelete !== -1) {
			Dream.all.remove(indexToDelete);
		}
	};
	
	//working here!!
	Dream.prototype.delete = function() {
		var that = this;
		$.post(
			"dreams/" + that.id,
			{ _method: 'delete' },
			function(deletedDream) {
				console.log(deletedDream);
				deleteDreamFromAll(deletedDream.id);
				_(Dream.callbacks).each(function(callback) {
					callback();
				});
			}
			//better not be no errors!
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
			.append($('<h4 class="inline">themes</h4>'))
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
			console.log($(event.target).parent());
			console.log($(event.target).hasClass('delete'));
			ul.off('click');
			var id = $(event.target).parent().data('id')
			if (id) {
				that.showDreamFunc(Dream.find(id));
				$oneDream.fadeIn(3000, function() {
					var dreamsLastMillis = 1000;
					setTimeout(function() {
						$oneDream.fadeOut(6000, function() {
							that.bindClick(ul);
						});
					}, dreamsLastMillis);
				});
			} else if ($(event.target).hasClass('delete')) {
				//delete!
				var doDelete = confirm("finished with this dream for now?")
				if (doDelete) {
					//delete
					var id = $(event.target).parent().data('id');
					console.log(id);
					Dream.find(id).delete();
				}
			}
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
				Tag.callbackIndexesToRemove = [];
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
			var tag;
			for (var i = 0; i < this.tags.length; i++) {
				tag = this.tags[i];				
				if (matches.length === 3) {
					// console.log('finished early');
					return matches;
				}
				if ( tag.content.indexOf(string) == 0 ) {
					// console.log('match found');
					matches.push(tag);
				}
			}
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
						.append($('<h4 class="inline">themes</h4>'))
						.append(ul);
	};
	
	Tagging.prototype.drawMatches = function(matches) {
		var that = this;
		var ul = $('<ul class="matches-list"></ul>')
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