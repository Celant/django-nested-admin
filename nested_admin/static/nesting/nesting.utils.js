var DJNesting = (typeof window.DJNesting != "undefined")
               ? DJNesting : {};

(function($) {

    DJNesting.regexQuote = function(str) {
        return (str+'').replace(/([\.\?\*\+\^\$\[\]\\\(\)\{\}\|\-])/g, "\\$1");
    };

    /**
     * Update attributes based on a regular expression
     */
    DJNesting.updateFormAttributes = function(elem, replace_regex, replace_with, selector) {
        if (!selector) {
            selector = ':input,span,table,iframe,label,a,ul,p,img,div.grp-module,div.module,div.group';
        }
        elem.find(selector).add(elem).each(function() {
            var node = $(this),
                node_id = node.attr('id'),
                node_name = node.attr('name'),
                node_for = node.attr('for'),
                node_href = node.attr("href");
            if (node_id) { node.attr('id', node_id.replace(replace_regex, replace_with)); }
            if (node_name) { node.attr('name', node_name.replace(replace_regex, replace_with)); }
            if (node_for) { node.attr('for', node_for.replace(replace_regex, replace_with)); }
            if (node_href) { node.attr('href', node_href.replace(replace_regex, replace_with)); }
            if (node_id && node.is('.module,.grp-module')) {
                node.attr('id', node.attr('id').replace(/_set-(\d+)$/, '_set$1'));
            }
        });
    };

    DJNesting.updatePositions = function(prefix) {
        var position = 0, parentPosition = 0, nestedPosition = 0, parentId = '',
            $group = $('#' + prefix + '-group'),
            fieldNames = $group.data('fieldNames'),
            // The field name on the fieldset which is a ForeignKey to the parent model
            groupFkName = $group.data('formsetFkName'),
            parentPkVal, parentIdMatches = prefix.match(/^(.*_set)\-(\d+)-[^\-]+_set$/);

        // If this is a formset that uses sub-articles, and they have not yet
        // been initialized, return.
        if (fieldNames.isSubarticle && !$group.data('nestingInitComplete')) {
            return;
        }

        if (parentIdMatches) {
            var parentPrefix = parentIdMatches[1];
            var index = parentIdMatches[2];
            var $parentGroup = $('#' + parentPrefix + '-group');
            var parentFieldNames = $parentGroup.data('fieldNames');
            var parentPkFieldName = parentFieldNames.pk;
            var parentPkField = $parentGroup.filterDjangoField(parentPrefix, parentPkFieldName, index);
            parentPkVal = parentPkField.val();
        }

        if (groupFkName && typeof(parentPkVal) != 'undefined') {
            $group.filterDjangoField(prefix, groupFkName).val(parentPkVal);
        }

        // Tracks whether the current/last element is marked for deletion
        var markedForDeletion = false;

        $group.find('.module.nested-inline-form').each(function() {
            if (!this.id || this.id.substr(-6) == '-empty') {
                return true; // Same as continue
            }
            var regex = new RegExp('^(?:id_)?' + DJNesting.regexQuote(prefix) + '\\d+$');

            if (!this.id.match(regex)) {
                return true;
            }
            // Cache jQuery object
            var $this = $(this),
                isSubarticle = $this.closest('.nested-sortable-container').hasClass('subarticle-wrapper'),
                prefixAndIndex = $this.djangoPrefixIndex() || [null, null],
                formPrefix = prefixAndIndex[0],
                index = prefixAndIndex[1];
            if (!formPrefix) {
                return;
            }

            // Skip the element if it's marked to be deleted
            if ($this.hasClass('predelete') || $this.hasClass('grp-predelete')) {
                // This means that an item that was marked delete because
                // it was a child of another element marked deleted, but
                // that it has been moved
                if ($this.hasClass('nested-delete') && (!isSubarticle || !markedForDeletion)) {
                    $this.removeClass('predelete nested-delete');
                    $this.filterDjangoField(formPrefix, 'DELETE').setDjangoBooleanInput(false);
                } else {
                    $this.filterDjangoField(formPrefix, fieldNames.position, index).val('0');
                    if (fieldNames.parentPosition) {
                        $this.filterDjangoField(formPrefix, fieldNames.parentPosition, index).val('0');
                    }
                    if (fieldNames.nestedPosition) {
                        $this.filterDjangoField(formPrefix, fieldNames.nestedPosition, index).val('0');
                    }
                    if (isSubarticle && !$this.parent().parent().closest('.nested-sortable-item').children('.nested-inline-form').hasClass('predelete')) {
                        markedForDeletion = false;
                    } else {
                        markedForDeletion = true;
                    }
                    return true;
                }
            }

            if (!isSubarticle || !markedForDeletion) {
                $this.filterDjangoField(formPrefix, fieldNames.position, index).val(position);
            }

            if (!isSubarticle && !markedForDeletion) {
                if (fieldNames.parentPosition) {
                    $this.filterDjangoField(formPrefix, fieldNames.parentPosition, index).val('0');
                }
                if (fieldNames.nestedPosition) {
                    $this.filterDjangoField(formPrefix, fieldNames.nestedPosition, index).val('0');
                }
            }
            if (isSubarticle) {
                if (markedForDeletion) {
                    $this.addClass('predelete nested-delete');
                    $this.filterDjangoField(formPrefix, 'DELETE', index).setDjangoBooleanInput(markedForDeletion);
                    $this.filterDjangoField(formPrefix, fieldNames.position, index).val('');
                    if (fieldNames.parentPosition) {
                        $this.filterDjangoField(formPrefix, fieldNames.parentPosition, index).val('0');
                    }
                    if (fieldNames.nestedPosition) {
                        $this.filterDjangoField(formPrefix, fieldNames.nestedPosition, index).val('0');
                    }
                    return true;
                }
                $this.filterDjangoField(formPrefix, fieldNames.isSubarticle, index).setDjangoBooleanInput(true);
                if (fieldNames.nestedPosition) {
                    $this.filterDjangoField(formPrefix, fieldNames.nestedPosition, index).val(nestedPosition);
                }
                if (fieldNames.parentPosition) {
                    $this.filterDjangoField(formPrefix, fieldNames.parentPosition, index).val('0');
                }
                if (fieldNames.parentFk) {
                    $this.filterDjangoField(formPrefix, fieldNames.parentFk, index).val(parentId);
                }
                nestedPosition++;
            } else {
                nestedPosition = 0;
                if (fieldNames.parentPosition) {
                    $this.filterDjangoField(formPrefix, fieldNames.parentPosition, index).val(parentPosition);
                }
                if (fieldNames.isSubarticle) {
                    $this.filterDjangoField(formPrefix, fieldNames.isSubarticle, index).setDjangoBooleanInput(false);
                }
                if (fieldNames.nestedPosition) {
                    $this.filterDjangoField(formPrefix, fieldNames.nestedPosition, index).val('0');
                }
                parentId = $this.filterDjangoField(formPrefix, fieldNames.pk, index).val();
                parentPosition++;
            }
            position++;
            markedForDeletion = false;
        });

        $(document).trigger('djnesting:mutate', [$group]);
    };

    if (typeof($.fn.setDjangoBooleanInput) != 'function') {
        $.fn.setDjangoBooleanInput = function(boolVal) {
            var i, input;
            for (i = 0; i < this.length; i++) {
                input = this[i];
                if (input.nodeName != 'INPUT') {
                    continue;
                }
                if (input.type == 'hidden') {
                    input.value = (boolVal) ? 'True' : 'False';
                } else if (input.type == 'checkbox') {
                    input.checked = boolVal;
                }
            }
        };
    }

    var prefixCache = {};

    $.fn.djangoPrefixIndex = function() {
        var $this = (this.length > 1) ? this.first() : this;
        var id = $this.attr('id'),
            name = $this.attr('name'),
            forattr = $this.attr('for'),
            inlineRegex = /^((?:.+_set|.+content_type.*))(?:(\-?\d+)|\-(\d+)\-(?!.*_set\d+)[^\-]+|\-group)$/,
            matches = [null, undefined, undefined],
            prefix, $form, $group, groupId, cacheKey, match, index;

        if ((match = prefixCache[id]) || (match = prefixCache[name]) || (match = prefixCache[forattr])) {
            return match;
        }

        if ((id && (matches = id.match(inlineRegex)))
          || (name && (matches = name.match(inlineRegex)))
          || (forattr && (matches = forattr.match(inlineRegex)))) {
            cacheKey = matches[0];
            prefix = matches[1];
            index = (typeof(matches[2]) == 'string') ? matches[2] : matches[3];
        }

        if (id && !prefix) {
            prefix = (id.match(/^(.*)\-group$/) || [null, null])[1];
        }

        // Handle cases where the related_name does not end with '_set'
        if (id && !prefix && $this.is('.module,.grp-module') && id.match(/\d+$/)) {
            matches = id.match(/(.*?\D)(\d+)$/) || [null, null, null];
            cacheKey = matches[0];
            prefix = matches[1];
            index = matches[2];
        }

        if (!prefix) {
            $form = $this.closest('.nested-inline-form');
            if ($form.length) {
                matches = $form.attr('id').match(inlineRegex) || [null, null, null, null];
                if (!matches[0]) {
                    matches = $form.attr('id').match(/(.*?\D)(\d+)$/) || [null, null, null, null];
                }
                cacheKey = matches[0];
                prefix = matches[1];
                index = (typeof(matches[2]) == 'string') ? matches[2] : matches[3];
            } else {
                $group = $this.closest('.group,.grp-group');
                if (!$group.length) {
                    return null;
                }
                groupId = $group.attr('id') || '';
                prefix = (groupId.match(/^(.*)\-group$/) || [null, null])[1];
            }
        } else {
            if (prefix.substr(0, 3) == 'id_') {
                prefix = prefix.substr(3);
            }

            if (!document.getElementById(prefix + '-group')) {
                return null;
            }
        }
        if (cacheKey) {
            prefixCache[cacheKey] = [prefix, index];
        }

        return [prefix, index];
    };

    $.fn.djangoFormPrefix = function() {
        var prefixIndex = this.djangoPrefixIndex();
        if (!prefixIndex || !prefixIndex[1]) {
            return null;
        }
        return prefixIndex[0] + '-' + prefixIndex[1] + '-';
    };

    $.fn.djangoFormsetPrefix = function() {
        var prefixIndex = this.djangoPrefixIndex();
        if (!prefixIndex) {
            return null;
        } else {
            return prefixIndex[0];
        }
    };

    var filterDjangoFormsetForms = function(form, $group, formsetPrefix) {
        var formId = form.getAttribute('id'),
            formIndex;

        // Check if form id matches /{prefix}\d+/
        if (formId.indexOf(formsetPrefix) !== 0) return false;

        var formIndex = formId.substr(formsetPrefix.length);

        return (!formIndex.match(/\D/));
    };

    // Selects all initial forms within the same formset as the
    // element the method is being called on.
    $.fn.djangoFormsetForms = function() {
        var forms = [];
        this.each(function() {
            var $this = $(this),
                formsetPrefix = $this.djangoFormsetPrefix(),
                $group = (formsetPrefix) ? $('#' + formsetPrefix + '-group') : null,
                $forms;

            if (!formsetPrefix || !$group.length) return;

            $forms = $group.find('.nested-inline-form').filter(function() {
                return filterDjangoFormsetForms(this, $group, formsetPrefix);
            });

            Array.prototype.push.apply(forms, $forms.get());
        });
        return this.pushStack(forms);
    };

    if (typeof($.djangoFormField) != 'function') {
        $.djangoFormField = function(fieldName, prefix, index) {
            var $empty = $([]), matches;
            if (matches = prefix.match(/^(.+)\-(\d+)\-$/)) {
                prefix = matches[1];
                index = matches[2];
            }
            index = parseInt(index, 10);
            if (isNaN(index)) {
                return $empty;
            }
            if (fieldName == 'pk' || fieldName == 'position') {
                var $group = $('#' + prefix + '-group'),
                    fieldNameData = $group.data('fieldNames') || {};
                fieldName = fieldNameData[fieldName];
                if (!fieldName) { return $empty; }
            }
            return $('#id_' + prefix + '-' + index + '-' + fieldName);
        };
    }

    if (typeof($.fn.djangoFormField) != 'function') {
        /**
         * Given a django model's field name, and the forms index in the
         * formset, returns the field's input element, or an empty jQuery
         * object on failure.
         *
         * @param String fieldName - "pk", "position", or the field's
         *                           name in django (e.g. 'content_type',
         *                           'url', etc.)
         * @return jQuery object containing the field's input element, or
         *         an empty jQuery object on failure
         */
        $.fn.djangoFormField = function(fieldName, index) {
            var prefixAndIndex = this.djangoPrefixIndex();
            var $empty = $([]);
            if (!prefixAndIndex) {
                return $empty;
            }
            var prefix = prefixAndIndex[0];
            if (typeof(index) == 'undefined') {
                index = prefixAndIndex[1];
                if (typeof(index) == 'undefined') {
                    return $empty;
                }
            }
            return $.djangoFormField(fieldName, prefix, index);
        };
    }

    if (typeof($.fn.filterDjangoField) != 'function') {
        var djRegexCache = {};
        $.fn.filterDjangoField = function(prefix, fieldName, index) {
            if (typeof index != 'undefined') {
                if (typeof index == 'string') {
                    index = parseInt(index, 10);
                }
                if (typeof index == 'number' && !isNaN(index)) {
                    var fieldId = 'id_' + prefix + '-' + index + '-' + fieldName;
                    return $('#' + fieldId);
                }
            }
            if (typeof(djRegexCache[prefix]) != 'object') {
                djRegexCache[prefix] = {};
            }
            if (typeof(djRegexCache[prefix][fieldName]) == 'undefined') {
                djRegexCache[prefix][fieldName] = new RegExp('^' + prefix + '-\\d+-' + fieldName + '$');
            }
            return this.find('input[name$="'+fieldName+'"]').filter(function(index) {
                return this.getAttribute("name").match(djRegexCache[prefix][fieldName]);
            });
        };
    }

    DJNesting.createContainerElement = function(parent) {
        var newContainer = document.createElement('DIV'),
            newItem = document.createElement('DIV'),
            emptyItem = document.createElement('DIV');
        newContainer.setAttribute('class', 'nested-sortable-container subarticle-wrapper');
        newItem.setAttribute('class', 'nested-sortable-item nested-do-not-drag');
        newItem.appendChild(emptyItem);
        newContainer.appendChild(newItem);
        return $(newContainer);
    };

    DJNesting.initSubArticleNesting = function($inline) {
        var fieldNames = $inline.data('fieldNames') || {};
        if (!fieldNames.isSubarticle) {
            return;
        }
        // Depending on whether subarticles are hidden or checkboxes, the selector
        // could be input[value=True] or input:checked
        var inputType = $inline.find('.row.' + fieldNames.isSubarticle + ' input').first().prop('type');
        var inputSelector = ' .row.' + fieldNames.isSubarticle + ' input';
        var inputTrueSelector, inputFalseSelector;
        if (inputType == 'checkbox') {
            inputTrueSelector = inputSelector + ':checked';
            inputFalseSelector = inputSelector + ':not(:checked)';
        } else {
            inputTrueSelector = inputSelector + '[value="True"]';
            inputFalseSelector = inputSelector + '[value="False"]';
        }

        var $isSubarticleInputs = $inline.find('.row.' + fieldNames.isSubarticle).find('input');

        var formsetPrefix = $inline.djangoFormsetPrefix();

        $.each($isSubarticleInputs.get().reverse(), function(i, input) {
            var $input = $(input),
                isSubarticle = ($input.val() == 'True' || $input.is(':checked')),
                $subarticle = $input.closest('.nested-sortable-item'),
                $subarticles = $subarticle.prevUntil('.nested-sortable-item:has(' + inputFalseSelector + ')', '.nested-sortable-item:has(' + inputTrueSelector + ')').andSelf(),
                $parentArticles = $subarticle.first().prevAll('.nested-sortable-item:has(' + inputFalseSelector + ')'),
                $parentArticle = $parentArticles.first(),
                parentArticleFormId = $parentArticle.children('.nested-inline-form').attr('id'),
                $subarticleWrapper;

            if ($input.djangoFormsetPrefix() != formsetPrefix) {
                return;
            }
            if ($subarticle.closest('.subarticle-wrapper').length) {
                return;
            }
            if ($subarticle.parent().hasClass('.nested-sortable-container')) {
                return;
            }
            if ($subarticle.find('.subarticle-wrapper').length) {
                return;
            }
            $parentArticle = $subarticle.prev('.nested-sortable-item');
            // This should never happen (a sub-article without a parent before it)
            // but if it did, we'll say that the article is not in fact a sub-article
            if (isSubarticle && !$parentArticle.length) {
                isSubarticle = false;
            }
            $subarticleWrapper = DJNesting.createContainerElement();

            if (isSubarticle) {
                $parentArticle = $('#' + parentArticleFormId).parent();
                $parentArticle[0].appendChild($subarticleWrapper[0]);
                $subarticleWrapper = $parentArticle.children('.subarticle-wrapper').last();
                $subarticles.each(function() {
                    $subarticleWrapper.append($(this));
                });
            } else {
                $subarticle.append($subarticleWrapper);
            }

        });

        $inline.attr('data-nesting-init-complete', 'true');
    };

    // Slight tweaks to the grappelli functions of the same name
    // (initRelatedFields and initAutocompleteFields).
    //
    // The most notable tweak is the call to $.fn.grp_related_generic() (a
    // jQuery method provided by django-curated) and the use of
    // DJNesting.LOOKUP_URLS to determine the ajax lookup urls.
    //
    // We abstract this out using form prefix because the way grappelli does it
    // (adding javascript at the bottom of each formset) doesn't really scale
    // with nested formsets.

    // The second parameter (groupData) is optional, and only exists to prevent
    // redundant calls to jQuery() and jQuery.fn.data() in the calling context
    DJNesting.initRelatedFields = function(prefix, groupData) {
        if (typeof DJNesting.LOOKUP_URLS != 'object' || !DJNesting.LOOKUP_URLS.related) {
            return;
        }
        var lookup_urls = DJNesting.LOOKUP_URLS;

        if (!groupData) {
            groupData = $('#' + prefix + '-group').data();
        }
        var lookup_fields = {
            related_fk:       groupData.lookupRelatedFk,
            related_m2m:      groupData.lookupRelatedM2m,
            related_generic:  groupData.lookupRelatedGeneric,
            autocomplete_fk:  groupData.lookupAutocompleteFk,
            autocomplete_m2m: groupData.lookupAutocompleteM2m,
            autocomplete_generic: groupData.lookupAutocompleteGeneric
        };

        $.each(lookup_fields.related_fk, function() {
            $('#' + prefix + '-group > div.items > div:not(.empty-form)')
            .find('input[name^="' + prefix + '"][name$="' + this + '"]')
            .grp_related_fk({lookup_url: lookup_urls.related});
        });
        $.each(lookup_fields.related_m2m, function() {
            $('#' + prefix + '-group > div.items > div:not(.empty-form)')
            .find('input[name^="' + prefix + '"][name$="' + this + '"]')
            .grp_related_m2m({lookup_url: lookup_urls.m2m});
        });
        $.each(lookup_fields.related_generic, function() {
            var content_type = this[0],
                object_id = this[1];
            $('#' + prefix + '-group > div.items > div:not(.empty-form)')
            .find('input[name^="' + prefix + '"][name$="' + this[1] + '"]')
            .each(function() {
                var $this = $(this);
                var id = $this.attr('id');
                var idRegex = new RegExp("(\\-\\d+\\-)" + object_id + "$");
                var i = id.match(idRegex);
                if (i) {
                    var ct_id = '#id_' + prefix + i[1] + content_type,
                        obj_id = '#id_' + prefix + i[1] + object_id;
                    $this.grp_related_generic({
                        content_type:ct_id,
                        object_id:obj_id,
                        lookup_url:lookup_urls.related
                    });
                }
            });
        });
    };
    DJNesting.initAutocompleteFields = function(prefix, groupData) {
        if (typeof DJNesting.LOOKUP_URLS != 'object' || !DJNesting.LOOKUP_URLS.related) {
            return;
        }
        var lookup_urls = DJNesting.LOOKUP_URLS;

        var $inline = $('#' + prefix + '-group');

        if (!groupData) {
            groupData = $inline.data();
        }
        var lookup_fields = {
            related_fk:       groupData.lookupRelatedFk,
            related_m2m:      groupData.lookupRelatedM2m,
            related_generic:  groupData.lookupRelatedGeneric,
            autocomplete_fk:  groupData.lookupAutocompleteFk,
            autocomplete_m2m: groupData.lookupAutocompleteM2m,
            autocomplete_generic: groupData.lookupAutocompleteGeneric
        };

        $.each(lookup_fields.autocomplete_fk, function() {
            $inline.find("input[name^='" + prefix + "'][name$='" + this + "']")
            .each(function() {
                $(this).grp_autocomplete_fk({
                    lookup_url: lookup_urls.related,
                    autocomplete_lookup_url: lookup_urls.autocomplete
                });
            });
        });
        $.each(lookup_fields.autocomplete_m2m, function() {
            $inline.find("input[name^='" + prefix + "'][name$='" + this + "']")
            .each(function() {
                $(this).grp_autocomplete_m2m({
                    lookup_url: lookup_urls.m2m,
                    autocomplete_lookup_url: lookup_urls.autocomplete
                });
            });
        });
        $.each(lookup_fields.autocomplete_generic, function() {
            var content_type = this[0],
                object_id = this[1];
            $inline.find("input[name^='" + prefix + "'][name$='" + this[1] + "']")
            .each(function() {
                var i = $(this).attr("id").match(/-\d+-/);
                if (i) {
                    var ct_id = "#id_" + prefix + i[0] + content_type,
                        obj_id = "#id_" + prefix + i[0] + object_id;
                    $(this).grp_autocomplete_generic({
                        content_type:ct_id,
                        object_id:obj_id,
                        lookup_url:lookup_urls.related,
                        autocomplete_lookup_url:lookup_urls.m2m
                    });
                }
            });
        });
    };

    // This function will update the position prefix for empty-form elements
    // in nested forms.
    DJNesting.updateNestedFormIndex = function updateNestedFormIndex(form, prefix) {
        var index = form.attr('id').replace(prefix, '');
        var elems = form.find('*[id^="' + prefix + '-empty-"]')
                         .add('*[id^="id_' + prefix + '-empty-"]', form)
                         .add('*[id^="lookup_id_' + prefix + '-empty-"]', form)
                         .add('label[for^="id_' + prefix + '-empty-"]', form);
        elems.each(function(i, elem) {
            var emptyLen = '-empty'.length;
            var attrs = ['id', 'name', 'for'];
            $.each(attrs, function(i, attr) {
                var val = elem.getAttribute(attr) || '',
                    emptyPos = val.indexOf('-empty');
                if (emptyPos > 0) {
                    var beforeEmpty = val.substr(0, emptyPos+1),
                        afterEmpty = val.substr(emptyPos+emptyLen),
                        newVal = beforeEmpty + index + afterEmpty.replace(index, '__prefix__');
                    elem.setAttribute(attr, newVal);
                }
            });
        });
    };

})((typeof grp == 'object' && grp.jQuery) ? grp.jQuery : django.jQuery);