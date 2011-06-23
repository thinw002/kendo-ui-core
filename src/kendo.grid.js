(function($, undefined) {
    var kendo = window.kendo,
        ui = kendo.ui,
        DataSource = kendo.data.DataSource,
        tbodySupportsInnerHtml = kendo.support.tbodyInnerHtml,
        Component = ui.Component,
        keys = kendo.keys,
        isPlainObject = $.isPlainObject,
        extend = $.extend,
        map = $.map,
        isArray = $.isArray,
        proxy = $.proxy,
        CELL_SELECTOR =  ">tbody>tr>td",
        FIRST_CELL_SELECTOR = "td:first",
        CHANGE = "change",
        DATABOUND = "dataBound",
        FOCUSED = "t-state-focused",
        FOCUSABLE = "t-focusable",
        STRING = "string";

    var Grid = Component.extend({
        init: function(element, options) {
            var that = this;

            options = isArray(options) ? { dataSource: options } : options;

            Component.fn.init.call(that, element, options);

            that.bind([CHANGE,DATABOUND], that.options);

            that._element();

            that._columns(that.options.columns);

            that._dataSource();

            that._tbody();

            that._thead();

            that._templates();

            that._pageable();

            that._navigatable();

            that._selectable();

            if (that.options.autoBind){
                that.dataSource.query();
            }
        },

        options: {
            columns: [],
            autoBind: true,
            dataSource: {}
        },

        _element: function() {
            var that = this,
                table = that.element;

            table.attr("tabIndex", Math.max(table.attr("tabIndex") || 0, 0));

            if (!table.is("table")) {
                table = $("<table />").appendTo(that.element);
            }

            that.table = table.attr("cellspacing", 0);

            that._wrapper();
        },

        _selectable: function() {
            var that = this,
                multi,
                cell,
                selectable = that.options.selectable;

            if (selectable) {
                multi = typeof selectable === STRING && selectable.toLowerCase().indexOf("multiple") > -1;
                cell = typeof selectable === STRING && selectable.toLowerCase().indexOf("cell") > -1;

                that.selectable = new kendo.ui.Selectable(that.element, {
                    filter: cell ? CELL_SELECTOR : ">tbody>tr",
                    multi: multi,
                    change: function() {
                        that.trigger(CHANGE);
                    }
                });

                that.element.keydown(function(e) {
                    if (e.keyCode === keys.SPACEBAR) {
                        var current = that.current();

                        if (!multi || !e.ctrlKey) {
                            that.selectable.clear();
                        }
                        that.selectable.value(cell ? current : current.parent());
                    }
                });
            }
        },

        current: function(element) {
            var that = this,
                current = that._current;

            if(element !== undefined && element.length) {
                if (!current || current[0] !== element[0]) {
                    element.addClass(FOCUSED);
                    if (current) {
                        current.removeClass(FOCUSED);
                    }
                    that._current = element;
                }
            } else {
                return that._current;
            }
        },

        _navigatable: function() {
            var that = this,
                element = that.element;

            element.bind({
                focus: function() {
                    that.current(element.find(FIRST_CELL_SELECTOR));
                },
                blur: function() {
                    if (that._current) {
                        that._current.removeClass(FOCUSED);
                        that._current = null;
                    }
                },
                keydown: function(e) {
                    var key = e.keyCode,
                        current = that.current(),
                        dataSource = that.dataSource,
                        pageable = that.options.pageable;

                    if (keys.UP === key) {
                        that.current(current ? current.parent().prev().children().eq(current.index()) : element.find(FIRST_CELL_SELECTOR));
                    } else if (keys.DOWN === key) {
                        that.current(current ? current.parent().next().children().eq(current.index()) : element.find(FIRST_CELL_SELECTOR));
                    } else if (keys.LEFT === key) {
                        that.current(current ? current.prev() : element.find(FIRST_CELL_SELECTOR));
                    } else if (keys.RIGHT === key) {
                        that.current(current ? current.next() : element.find(FIRST_CELL_SELECTOR));
                    } else if (pageable && keys.PAGEUP == key) {
                        that._current = null;
                        dataSource.page(dataSource.page() + 1);
                    } else if (pageable && keys.PAGEDOWN == key) {
                        that._current = null;
                        dataSource.page(dataSource.page() - 1);
                    }
                }
            });

            element.addClass(FOCUSABLE)
                  .delegate("." + FOCUSABLE + CELL_SELECTOR, "mousedown", function(e) {
                      that.current($(e.currentTarget));
                  });
        },

        _wrapper: function() {
            var that = this,
                table = that.table,
                wrapper;

            wrapper = table.parent();

            if (!wrapper.is("div")) {
               wrapper = table.wrap("<div />").parent();
            }

            that.wrapper = wrapper.addClass("t-grid t-widget");
        },

        _tbody: function() {
            var that = this,
                table = that.table,
                tbody;

            tbody = table.find(">tbody");

            if (!tbody.length) {
                tbody = $("<tbody />").appendTo(table);
            }

            that.tbody = tbody;
        },

        _scrollable: function() {
            var that = this,
                header,
                content,
                table,
                scrollable = that.options.scrollable;

            if (scrollable) {
                header = that.wrapper.children().filter(".t-grid-header");

                if (!header[0]) {
                    header = $('<div class="t-grid-header" />').insertBefore(that.table);
                }

                header.css("padding-right", kendo.support.scrollbar);
                table = $('<table cellspacing="0" />');
                table.append(that.thead.remove());
                header.empty().append($('<div class="t-grid-header-wrap" />').append(table));

                if (!that.table.parent().is(".t-grid-content")) {
                    that.table.wrap('<div class="t-grid-content" />');
                }
            }
        },

        _dataSource: function() {
            var that = this,
                options = that.options,
                dataSource = options.dataSource;

            dataSource = isArray(dataSource) ? { data: dataSource } : dataSource;

            if (isPlainObject(dataSource)) {
                extend(dataSource, { table: that.table, fields: that.columns });

                if (options.data) {
                    dataSource.data = options.data;
                }

                pageable = options.pageable;

                if (isPlainObject(pageable) && pageable.pageSize !== undefined) {
                    dataSource.pageSize = pageable.pageSize;
                }
            }

            that.dataSource = DataSource.create(dataSource).bind(CHANGE, proxy(that.refresh, that));
        },

        _pageable: function() {
            var that = this,
                wrapper,
                pageable = that.options.pageable;

            if (pageable) {
                wrapper = that.wrapper.children("div.t-grid-pager");

                if (!wrapper.length) {
                    wrapper = $('<div class="t-grid-pager"><ul /></div>').appendTo(that.wrapper);
                }

                that.pager = pageable instanceof kendo.ui.Pager ? pageable : new kendo.ui.Pager(wrapper.children("ul"), extend({}, pageable, { dataSource: that.dataSource }));
            }
        },

        _sortable: function() {
            var that = this,
                sortable = that.options.sortable;

            if (sortable) {
                that.thead.find("th").kendoSortable(extend({}, sortable, { dataSource: that.dataSource }));
            }
        },

        _columns: function(columns) {
            var that = this;

            // using HTML5 data attributes as a configuration option e.g. <th data-field="foo">Foo</foo>
            columns = columns.length ? columns : map(that.table.find("th"), function(th) {
                var th = $(th),
                    field = th.data("field");

                if (!field) {
                   field = th.text().replace(/\s|[^A-z0-9]/g, "");
                }

                return {
                    field: field,
                    template: th.data("template")
                };
            });

            that.columns = map(columns, function(column) {
                column = typeof column === STRING ? { field: column } : column;
                return extend({ encoded: true }, column);
            });
        },

        _tmpl: function(start, rowTemplate) {
            var that = this,
                settings = extend({}, kendo.Template, that.options.templateSettings);

            if (!$.isFunction(rowTemplate)) {

                if (!rowTemplate) {
                    rowTemplate = start;

                    $.each(that.columns, function() {
                        var column = this, template = column.template, field = column.field;

                        if (!template) {
                            if (column.encoded === true) {
                                template = "${" + (settings.useWithBlock ? "" : settings.paramName + ".") + field + "}";
                            } else {
                                template = settings.begin + "=" + (settings.useWithBlock ? "" : settings.paramName + ".") + field + settings.end;
                            }
                        }

                        rowTemplate += "<td>" + template + "</td>";
                    });

                    rowTemplate += "</tr>";
                }

                rowTemplate = kendo.template(rowTemplate, settings);
            }

            return rowTemplate;
        },

        _templates: function() {
            var that = this,
                options = that.options;

            that.rowTemplate = that._tmpl("<tr>", options.rowTemplate);
            that.altRowTemplate = that._tmpl('<tr class="t-alt">', options.altRowTemplate || options.rowTemplate);
        },

        _thead: function() {
            var that = this,
                columns = that.columns,
                idx,
                length,
                html = "",
                thead = that.table.find("thead"),
                tr,
                th;

            if (!thead.length) {
                thead = $("<thead/>").insertBefore(that.tbody);
            }

            tr = that.table.find("tr").filter(":has(th)");

            if (!tr.length) {
                tr = thead.children().first();
                if(!tr.length) {
                    tr = $("<tr/>");
                }
            }

            if (!tr.children().length) {
                for (idx = 0, length = columns.length; idx < length; idx++) {
                    th = columns[idx];
                    html += "<th data-field='" + th.field + "'>" + (th.title || th.field) + "</th>";
                }

                tr.html(html);
            }

            tr.find("th").addClass("t-header");

            tr.appendTo(thead);

            that.thead = thead;

            that._sortable();

            that._scrollable();
        },

        _autoColumns: function(schema) {
            if (schema) {
                var that = this,
                    field;

                for (field in schema) {
                    that.columns.push({
                        field: field
                    });
                }

                that._thead();

                that._templates();
            }
        },

        refresh: function() {
            var that = this,
                length,
                idx,
                html = "",
                data = that.dataSource.view(),
                tbody,
                placeholder,
                rowTemplate,
                altRowTemplate;

            if (!that.columns.length) {
                that._autoColumns(data[0]);
            }

            rowTemplate = that.rowTemplate,
            altRowTemplate = that.altRowTemplate;

            for (idx = 0, length = data.length; idx < length; idx++) {
                if (idx % 2) {
                   html += altRowTemplate(data[idx]);
                } else {
                   html += rowTemplate(data[idx]);
                }
            }

            if (tbodySupportsInnerHtml) {
                that.tbody[0].innerHTML = html;
            } else {
                placeholder = document.createElement("div");
                placeholder.innerHTML = "<table><tbody>" + html + "</tbody></table>";
                tbody = placeholder.firstChild.firstChild;
                that.table[0].replaceChild(tbody, that.tbody[0]);
                that.tbody = $(tbody);
            }
            that.trigger(DATABOUND);
       }
    });

    ui.plugin("Grid", Grid);
})(jQuery);
