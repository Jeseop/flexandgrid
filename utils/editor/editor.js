(function () {
  class Tag {
    constructor({ className, elem }) {
      this.className = className;
      this._initElem(elem);
      this._initClassName();
    }

    static setAttributes(elem, options) {
      Object.entries(options).forEach(([attribute, value]) =>
        elem.setAttribute(attribute, value)
      );
    }

    static appendChildren(elem, children) {
      children.forEach((child) => {
        if (typeof child === 'string') {
          elem.appendChild(document.createTextNode(child));
        } else if (child instanceof Node) {
          elem.appendChild(child);
        } else if (child instanceof Tag) {
          elem.appendChild(child.elem);
        }
      });
    }

    static addEventListeners(elem, options) {
      Object.entries(options).forEach(([event, listener]) => {
        elem.addEventListener(event, listener);
      });
    }

    static createElement(tagName, attributes, textContent = '') {
      const elem = document.createElement(tagName);
      Tag.setAttributes(elem, attributes);
      elem.textContent = textContent;
      return elem;
    }

    static getLetterWidth(elem, text = 'a') {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      context.font = getComputedStyle(elem).font;
      return context.measureText(text).width;
    }

    get dataset() {
      return this.elem.dataset;
    }

    get classList() {
      return this.elem.classList;
    }

    get scrollTop() {
      return this.elem.scrollTop;
    }

    set scrollTop(value) {
      this.elem.scrollTop = value;
    }

    _initElem(elem) {
      if (typeof elem === 'string') {
        this.elem = document.createElement(elem);
      } else if (elem instanceof HTMLElement) {
        this.elem = elem;
      } else {
        this.elem = document.createElement('div');
      }
    }

    _initClassName() {
      if (this.className) {
        this.elem.setAttribute('class', this.className);
      }
    }

    initAllChildrenStyle() {
      this.querySelectorAll('*').forEach((elem) => (elem.style = ''));
    }

    appendChild(child) {
      if (Array.isArray(child)) {
        child.forEach((elem) => this.appendChild(elem));
      } else if (child instanceof Tag) {
        this.elem.appendChild(child.elem);
      } else if (child instanceof Node) {
        this.elem.appendChild(child);
      }
    }

    insertBefore(newNode, refNode) {
      const ref = refNode instanceof Tag ? refNode.elem : refNode;
      if (newNode instanceof Tag) {
        this.elem.insertBefore(newNode.elem, ref);
      } else if (newNode instanceof Node) {
        this.elem.insertBefore(newNode, ref);
      }
    }

    removeChild(child) {
      if (Array.isArray(child)) {
        child.forEach((elem) => this.elem.removeChild(elem));
      } else if (child instanceof Tag) {
        this.elem.removeChild(child.elem);
      } else if (child instanceof Node) {
        this.elem.removeChild(child);
      }
    }

    removeAllChildren = () => {
      while (this.elem.lastElementChild) {
        this.elem.removeChild(this.elem.lastElementChild);
      }
    };

    addEventListener(type, listener) {
      this.elem.addEventListener(type, listener);
    }

    querySelector(selector) {
      return this.elem.querySelector(selector);
    }

    querySelectorAll(selector) {
      return [...this.elem.querySelectorAll(selector)];
    }
  }

  // preview 안에 있는 container, item 요소들
  class PreviewTag extends Tag {
    constructor({ className, parent = null, text = null }) {
      super({ className });
      this.children = [];
      this.parent = parent;
      this.text = text;
    }

    removeChild(child) {
      super.removeChild(child);
      if (this.children.includes(child)) {
        this.children.splice(this.children.indexOf(child), 1);
      }
    }

    push(child) {
      this.children.push(child);
      child.parent = this;
    }

    // 재귀적으로 모든 자손 요소 추가
    render() {
      this.removeAllChildren();
      this.children.forEach((child) => {
        child.render();
        this.elem.appendChild(child.elem);
      });
    }
  }

  class Editor {
    // CSS 파싱을 위한 정규표현식
    static CSS_STRING =
      /((\.((container\d*)|(item\d*)))+(:[\w\-]*)?(::[\w\-]*)?\s*)+\{[^{}]*\}/g;

    // data-item을 입력하지 않았을 경우 기본값
    static DEFAULT_ITEM = 3;

    // 여분 코드 라인
    static EXTRA_CODE_LINE = 3;

    // 드롭다운 한 줄 높이
    static DROPDOWN_HEIGHT = 30;

    // 코드 라인 한 줄 높이
    static CODE_HEIGHT = 24;

    // CSS 프로퍼티 정보
    static CSS_PROPS_INFO = {
      'align-content': [
        'center',
        'flex-end',
        'flex-start',
        'normal',
        'space-around',
        'space-between',
        'space-evenly'
      ],
      'align-items': ['center', 'flex-end', 'flex-start', 'normal'],
      'align-self': [
        'center',
        'flex-end',
        'flex-start',
        'normal',
        'space-around',
        'space-between',
        'space-evenly'
      ],
      'column-gap': 'text',
      display: ['block', 'flex'],
      flex: 'text',
      'flex-basis': 'text',
      'flex-direction': ['column', 'column-reverse', 'row', 'row-reverse'],
      'flex-grow': 'text',
      'flex-shrink': 'text',
      'flex-wrap': ['nowrap', 'wrap', 'wrap-reverse'],
      gap: 'text',
      grid: 'text',
      'grid-area': [],
      'grid-auto-columns': [],
      'grid-auto-rows': [],
      'grid-column': [],
      'grid-column-end': [],
      'grid-column-start': [],
      'grid-template-areas': [],
      'grid-template-columns': [],
      'grid-template-rows': [],
      'grid-row': [],
      'grid-row-end': [],
      'grid-row-start': [],
      height: 'text',
      'justify-content': [
        'center',
        'flex-end',
        'flex-start',
        'normal',
        'space-around',
        'space-between',
        'space-evenly'
      ],
      order: 'text',
      'row-gap': 'text',
      width: 'text'
    };

    // CSS 프로퍼티 목록
    static CSS_PROPS = Object.keys(Editor.CSS_PROPS_INFO);

    // code 태그에 있는 문자열을 파싱하여 객체로 변환
    static parseCssText(cssText) {
      const trimmedCss = cssText.replace(/\s+/g, ' ');
      const matchedCssArr = trimmedCss.match(Editor.CSS_STRING);
      if (!matchedCssArr) {
        return [];
      }
      return matchedCssArr.map((matchedCss) => {
        const index = matchedCss.indexOf('{');
        const selector = matchedCss.slice(0, index).trim();
        const props = matchedCss
          .slice(index + 1, -1)
          .trim()
          .split(';')
          .filter((css) => css)
          .map((css) => {
            const [prop, value = ''] = css.split(':').map((v) => v.trim());
            return { prop, value };
          });
        return { selector, props };
      });
    }

    static parseHtmlStructureText(structText) {
      const container = [];
      const structure = structText.replace(/\d+/g, (match) =>
        'i'.repeat(+match)
      );
      let curContainer = container;
      for (const text of structure) {
        switch (text) {
          case '[':
            const child = new PreviewTag({
              className:
                curContainer === container ? 'container' : 'item container'
            });
            curContainer.push(child);
            curContainer = child;
            break;

          case 'i':
            curContainer.push(new PreviewTag({ className: 'item' }));
            break;

          case ']':
            curContainer = curContainer.parent ?? container;
            break;

          default:
            throw new Error('올바르지 않은 형식입니다');
        }
      }
      return container;
    }

    constructor(elem, editorId) {
      this._editorId = editorId;
      this._editor = new Tag({ elem });
      this._snippetIndex = 0;
      this._snippets = [];
      this._itemCountVariation = new Map();
      this._init();
    }

    get _curSnippet() {
      return this._snippets[this._snippetIndex];
    }

    // 각 코드 라인별로 들어갈 정보를 배열로 반환
    get _cssCodeLines() {
      const codeLines = [];
      for (const { selector, props } of this._curCss) {
        codeLines.push(
          selector,
          ...props.map(({ prop, value }) => `${prop}:${value}`),
          '}',
          '\u00A0'
        );
      }
      if (this._mode === 'snippet') {
        for (let i = 0; i < Editor.EXTRA_CODE_LINE; i++) {
          codeLines.push('');
        }
      } else if (this._mode === 'free') {
        if (!codeLines.length) {
          codeLines.push('');
        }
      }
      return codeLines;
    }

    get _classList() {
      const containerCount =
        this._previewWrapper.querySelectorAll('.container').length;
      const containers =
        containerCount > 1
          ? [...Array(containerCount)].map(
              (_, index) => `container${index + 1}`
            )
          : ['container'];
      const itemCount = this._previewWrapper.querySelectorAll('.item').length;
      const items = [...Array(itemCount)].map((_, index) => `item${index + 1}`);
      return [...containers, ...items];
    }

    // Init
    // ------------------------------------------------------------------------------

    _init() {
      this._initMode();
      this._initSnippets();
      this._initCurCss();

      if (this._mode === 'free') {
        this._initTitle();
      }

      this._initElements();
    }

    _initMode() {
      const { mode = 'snippet' } = this._editor.dataset;
      this._mode = mode;
      if (this._mode === 'snippet') {
        this._editor.classList.add('snippet-mode');
      } else if (this._mode === 'free') {
        this._editor.classList.add('free-mode', `editor-${this._editorId}`);
      }
    }

    _initTitle() {
      const { title = '' } = this._editor.dataset;
      this._title = title;
    }

    _initSnippets() {
      const codes = this._editor.querySelectorAll('code');
      codes.forEach(({ dataset: { snippet, item }, textContent }) => {
        let snippetName;
        if (this._mode === 'snippet' && !snippet) {
          snippetName = '제목없음';
        } else {
          snippetName = snippet ?? 'main';
        }

        let html;
        if (this._mode === 'snippet') {
          const { item: defaultItemCount } = this._editor.dataset;
          html = this._createSingleContainerHtml(defaultItemCount, item);
        } else if (this._mode === 'free') {
          const { item: defaultItemCount } = codes[0].dataset;
          if (defaultItemCount) {
            html = this._createSingleContainerHtml(defaultItemCount);
          } else {
            html = this._createMultiContainerHtml(codes[0]);
          }
        }

        if (this._mode === 'free') {
          this._stylesheet = this._createStylesheet(textContent);
        }

        this._snippets.push({
          name: snippetName,
          html,
          css: Editor.parseCssText(textContent)
        });
      });
    }

    _initCurCss() {
      const cssArr = [...this._curSnippet.css];
      this._curCss = cssArr.map(({ selector, props }) => ({
        selector,
        props: [...props.map((prop) => ({ ...prop }))]
      }));
    }

    _initElements() {
      this._initPreview();
      this._initCode();
      this._initSnippetList();
      this._initButtons();
    }

    _initPreview() {
      this._preview = new Tag({ className: 'preview' });
      this._previewWrapper = new Tag({ className: 'wrapper-preview' });
      const containers = this._curSnippet.html;
      containers.forEach((container) => {
        container.render();
        this._previewWrapper.appendChild(container);
      });

      if (this._mode === 'free') {
        this._style = document.createElement('style');
        this._style.textContent = this._stylesheet;
        this._preview.appendChild(this._style);
      }

      this._preview.appendChild(this._previewWrapper);
    }

    _initCode() {
      this._curCode = 'CSS';
      this._code = new Tag({ className: 'code' });
      this._codeWrapper = new Tag({ className: 'wrapper-code' });
      const code = this._createCssCodeElements();
      this._codeWrapper.appendChild(code);

      if (this._mode === 'snippet') {
        this._code.appendChild(this._codeWrapper);
        this._code.addEventListener('click', (e) =>
          this._codeClickEventListener(e)
        );
      } else if (this._mode === 'free') {
        const header = this._createCodeHeader();
        const inner = new Tag({ className: 'inner-code' });
        inner.appendChild(this._codeWrapper);
        this._code.appendChild([header, inner]);
      }

      this._isDropdownOpen = false;
    }

    _initSnippetList() {
      this._snippetList = new Tag({ className: 'list-snippet' });
      const form = document.createElement('form');

      this._snippets.forEach(({ name }, index) => {
        const input = Tag.createElement('input', {
          type: 'radio',
          id: `editor${this._editorId}-snippet${index + 1}`,
          name: `snippet`,
          class: 'input-snippet'
        });
        if (!index) {
          input.setAttribute('checked', true);
        }

        const label = Tag.createElement(
          'label',
          {
            for: `editor${this._editorId}-snippet${index + 1}`,
            class: 'label-snippet'
          },
          name
        );

        input.addEventListener('change', () =>
          this._snippetChangeEventListener(index)
        );

        Tag.appendChildren(form, [input, label]);
      });
      this._snippetList.appendChild(form);
    }

    _initButtons() {
      this._buttons = new Tag({ className: 'buttons' });

      const addButton = Tag.createElement(
        'button',
        {
          type: 'button',
          class: 'button button-add'
        },
        '+ Add Box'
      );
      addButton.addEventListener('click', () =>
        this._addItemClickEventListener()
      );

      const removeButton = Tag.createElement(
        'button',
        {
          type: 'button',
          class: 'button button-remove'
        },
        '- Remove Box'
      );
      removeButton.addEventListener('click', () =>
        this._removeItemClickEventListener()
      );

      this._buttons.appendChild([addButton, removeButton]);
    }

    // Create
    // ------------------------------------------------------------------------------

    _createCssCodeElements() {
      if (this._mode === 'snippet') {
        return this._createCssCodeButtonTable();
      } else if (this._mode === 'free') {
        if (this._curCode === 'CSS') {
          return this._createCssCodeTextTable();
        } else if (this._curCode === 'HTML') {
          return this._createHtmlCodeButtonTable();
        }
      }
    }

    _createCssCodeButtonTable() {
      let selectorIndex = 0;
      let propIndex = 0;

      const table = document.createElement('table');

      this._cssCodeLines.forEach((line, index) => {
        const row = document.createElement('tr');

        const lineNumber = Tag.createElement(
          'td',
          {
            class: 'number-line'
          },
          index + 1
        );

        const codeLine = Tag.createElement('td', { class: 'code-line' });
        if (line[0] === '.') {
          this._createSelectorCodeLine(line, codeLine, selectorIndex);
        } else if (line.includes(':')) {
          this._createPropCodeLine(line, codeLine, selectorIndex, propIndex);
          propIndex += 1;
        } else {
          codeLine.textContent = line;
          if (line.trim() === '') {
            const addButton = this._createAddCodeButton(selectorIndex);
            codeLine.appendChild(addButton);
          } else if (line === '}') {
            selectorIndex += 1;
            propIndex = 0;
          }
        }

        Tag.appendChildren(row, [lineNumber, codeLine]);
        table.appendChild(row);
      });
      return table;
    }

    _createCssCodeTextTable() {
      const table = Tag.createElement('table', { tabindex: '-1' });

      this._cssCodeLines.forEach((line, index) => {
        const row = document.createElement('tr');

        const lineNumber = Tag.createElement(
          'td',
          {
            class: 'number-line'
          },
          index + 1
        );

        const codeLine = Tag.createElement('td', {
          class: 'code-line',
          'data-index': index
        });
        if (line[0] === '.') {
          this._updateSelectorCodeLineStyle(line, codeLine);
        } else if (line.includes(':')) {
          this._updatePropCodeLineStyle(line, codeLine);
        } else {
          codeLine.textContent = line;
        }

        Tag.appendChildren(row, [lineNumber, codeLine]);
        table.appendChild(row);
      });

      Tag.addEventListeners(table, {
        mousedown: (e) => this._textTableMousedownEventListener(e),
        mouseup: (e) => this._textTableMouseUpEventListener(e),
        keydown: (e) => this._textTableKeydownEventListener(e)
      });

      return table;
    }

    // 여기에 CssCodeTextTable을 클릭했을 때 대체될 div와 textarea 생성
    _createCssCodeTextarea() {
      const textareaWrapper = Tag.createElement('div', {
        class: 'wrapper-textarea'
      });
      const numbers = new Tag({ className: 'container-number' });
      const textarea = Tag.createElement('textarea', {
        spellcheck: false,
        class: 'textarea-code'
      });

      const codeLines = [];
      this._cssCodeLines.forEach((line, index) => {
        const lineNumber = Tag.createElement(
          'span',
          {
            class: 'number-line'
          },
          index + 1
        );
        numbers.appendChild(lineNumber);

        if (line[0] === '.') {
          codeLines.push(`${line} {`);
        } else if (line.includes(':')) {
          const [prop, value] = line.split(':');
          codeLines.push(`  ${prop}: ${value};`);
        } else {
          codeLines.push(line);
        }
      });
      textarea.value = codeLines.join('\n');
      textarea.style.height = codeLines.length * Editor.CODE_HEIGHT + 'px';
      Tag.addEventListeners(textarea, {
        input: (e) => this._textAreaInputEventListener(e, numbers),
        blur: () => this._textTableBlurEventListener()
      });
      Tag.appendChildren(textareaWrapper, [numbers, textarea]);
      return textareaWrapper;
    }

    _createHtmlCodeButtonTable() {
      const table = Tag.createElement('table', { class: 'html-table' });

      // HTML 코드가 한 줄도 없으면 빈 줄 하나 만들기
      if (!this._snippets[0].html.length) {
        const row = document.createElement('tr');
        const lineNumber = Tag.createElement(
          'td',
          {
            class: 'number-line'
          },
          1
        );
        const codeLine = Tag.createElement('td', {
          class: 'code-line html-code'
        });
        const addButton = this._createAddInnerTagButton();
        Tag.appendChildren(codeLine, [addButton]);
        Tag.appendChildren(row, [lineNumber, codeLine]);
        table.appendChild(row);
      }

      const codeLines = this._snippets[0].html.reduce((acc, container) => {
        const code = this._createHtmlCodeLines(container);
        return [...acc, ...code];
      }, []);

      codeLines.forEach((line, index) => {
        const row = document.createElement('tr');

        const lineNumber = Tag.createElement(
          'td',
          {
            class: 'number-line'
          },
          index + 1
        );

        const codeLine = Tag.createElement('td', {
          class: 'code-line html-code'
        });
        const indentation = '\u00A0'.repeat(line.depth * 2);
        const { tagName } = line.tag.elem;
        const isRootContainer = !line.tag.children.length && !line.tag.parent;

        const openingTag = line.className
          ? this._createOpeningTag(tagName, line.className)
          : [];

        const textInput =
          typeof line.textContent === 'string' && !isRootContainer
            ? Tag.createElement('input', {
                class: 'button-code text-code',
                value: line.textContent,
                spellcheck: false
              })
            : null;

        if (textInput) {
          const value = line.textContent;
          if (value.trim() === '') {
            textInput.classList.add('button-blank');
          }
          textInput.style.width =
            (value.length ? (value.length + 1) * 9 : 30) + 'px';
          Tag.addEventListeners(textInput, {
            click: this._codeInputEventListener,
            keydown: (e) => {
              if (e.key === 'Enter' || e.key === 'Escape') {
                e.currentTarget.blur();
              } else {
                this._codeInputEventListener(e);
              }
            },
            keyup: this._codeInputEventListener,
            focus: ({ currentTarget }) => {
              currentTarget.classList.remove('button-blank');
            },
            blur: ({ currentTarget }) => {
              line.tag.elem.textContent = currentTarget.value;
              line.tag.text = currentTarget.value;
              currentTarget.style.width =
                (value.length ? (value.length + 1) * 9 : 30) + 'px';
              this._updateHtmlCode();
            }
          });
        }

        const innerAddButton =
          textInput || isRootContainer
            ? this._createAddInnerTagButton(line.tag)
            : null;

        const closingTag =
          !(typeof line.textContent === 'string') && line.className
            ? null
            : `</${tagName.toLowerCase()}>`;

        const deleteButton = this._createDeleteTagButton(line.tag);

        const addButton =
          openingTag.length && !closingTag
            ? this._createAddInnerTagButton(line.tag)
            : this._createAddAdjacentTagButton(
                line.tag,
                line.tag.parent ?? this._previewWrapper
              );

        Tag.appendChildren(codeLine, [
          deleteButton,
          indentation,
          ...openingTag,
          textInput,
          innerAddButton,
          closingTag,
          addButton
        ]);
        Tag.appendChildren(row, [lineNumber, codeLine]);
        table.appendChild(row);
      });
      return table;
    }

    _createSingleContainerHtml(defaultItemCount, item) {
      const length = Number.isInteger(Number(item))
        ? Number(item)
        : defaultItemCount
        ? Number(defaultItemCount)
        : Editor.DEFAULT_ITEM;
      const container = new PreviewTag({ className: 'container' });
      for (let i = 0; i < length; i++) {
        container.push(new PreviewTag({ className: 'item' }));
      }
      return [container];
    }

    _createMultiContainerHtml(code) {
      const { struct = '[3]' } = code.dataset;
      return Editor.parseHtmlStructureText(struct);
    }

    _createSelectorCodeLine(line, codeLine, selectorIndex) {
      const selectorSpan = Tag.createElement(
        'span',
        {
          class: 'button-code selector-code',
          'data-selector-index': selectorIndex
        },
        line.slice(1)
      );
      if (line.slice(1).trim() === '') {
        selectorSpan.classList.add('button-blank');
      }
      const deleteButton = this._createDeleteCodeButton(selectorIndex);

      Tag.appendChildren(codeLine, [
        deleteButton,
        '.',
        selectorSpan,
        '\u00A0{'
      ]);
    }

    _createPropCodeLine(line, codeLine, selectorIndex, propIndex) {
      const [prop, value] = line.split(':');
      const propSpan = this._createPropCodeButton(
        prop,
        selectorIndex,
        propIndex
      );
      const valueElem = this._createValueCodeButton(
        prop,
        value,
        selectorIndex,
        propIndex
      );
      const deleteButton = this._createDeleteCodeButton(
        selectorIndex,
        propIndex
      );
      const addButton = this._createAddCodeButton(selectorIndex, propIndex);

      Tag.appendChildren(codeLine, [
        deleteButton,
        '\u00A0\u00A0',
        propSpan,
        ':\u00A0',
        valueElem,
        ';',
        addButton
      ]);
    }

    _createPropCodeButton(prop, selectorIndex, propIndex) {
      const propSpan = Tag.createElement(
        'span',
        {
          class: 'button-code prop-code',
          'data-selector-index': selectorIndex,
          'data-prop-index': propIndex
        },
        prop
      );
      if (prop.trim() === '') {
        propSpan.classList.add('button-blank');
      }
      return propSpan;
    }

    _createValueCodeButton(prop, value, selectorIndex, propIndex) {
      let valueElem;
      if (Editor.CSS_PROPS_INFO[prop] === 'text') {
        valueElem = Tag.createElement('input', {
          class: 'button-code value-code',
          value,
          spellcheck: false,
          'data-selector-index': selectorIndex,
          'data-prop-index': propIndex
        });
        valueElem.style.width =
          (value.length ? (value.length + 1) * 9 : 30) + 'px';

        Tag.addEventListeners(valueElem, {
          click: this._codeInputEventListener,
          keydown: (e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
              e.currentTarget.blur();
            } else {
              this._codeInputEventListener(e);
            }
          },
          keyup: this._codeInputEventListener,
          focus: ({ currentTarget }) => {
            currentTarget.classList.remove('button-blank');
          },
          blur: ({ currentTarget }) => {
            const {
              dataset: { selectorIndex, propIndex },
              value
            } = currentTarget;
            this._curCss[selectorIndex].props[propIndex].value = value;
            currentTarget.style.width =
              (value.length ? (value.length + 1) * 9 : 30) + 'px';
            this._updateCssCode();
          }
        });
      } else {
        valueElem = Tag.createElement(
          'span',
          {
            class: 'button-code value-code',
            'data-selector-index': selectorIndex,
            'data-prop-index': propIndex
          },
          value
        );
      }
      if (value.trim() === '') {
        valueElem.classList.add('button-blank');
      }
      return valueElem;
    }

    _createDeleteCodeButton(selectorIndex, propIndex) {
      const elem = Tag.createElement('button', {}, '-');
      if (typeof propIndex === 'number') {
        Tag.setAttributes(elem, {
          type: 'button',
          class: 'button-delete',
          'data-selector-index': selectorIndex,
          'data-prop-index': propIndex
        });
        elem.addEventListener('click', () => {
          this._curCss[selectorIndex].props.splice(propIndex, 1);
          this._updateCssCode();
        });
      } else {
        Tag.setAttributes(elem, {
          type: 'button',
          class: 'button-delete',
          'data-selector-index': selectorIndex
        });
        elem.addEventListener('click', () =>
          this._removeCodeClickEventListener(selectorIndex)
        );
      }
      return elem;
    }

    _createAddCodeButton(selectorIndex, propIndex) {
      const elem = Tag.createElement(
        'button',
        {
          type: 'button',
          'data-selector-index': selectorIndex
        },
        '+'
      );
      if (typeof propIndex === 'number') {
        Tag.setAttributes(elem, {
          class: 'button-add',
          'data-prop-index': propIndex
        });
        elem.addEventListener('click', () => {
          this._curCss[selectorIndex].props.splice(propIndex + 1, 0, {
            prop: '\u00A0'.repeat(4),
            value: '\u00A0'.repeat(4)
          });
          this._updateCssCode();
        });
      } else {
        elem.setAttribute('class', 'button-add button-add-selector');
        elem.addEventListener('click', () =>
          this._addCodeClickEventListener(selectorIndex)
        );
      }
      return elem;
    }

    _createDeleteTagButton(tag) {
      const elem = Tag.createElement(
        'button',
        { type: 'button', class: 'button-delete' },
        '-'
      );
      elem.addEventListener('click', () => {
        const { parent } = tag;
        if (parent) {
          parent.removeChild(tag);
        } else {
          this._previewWrapper.removeChild(tag);
          this._snippets[0].html.splice(this._snippets[0].html.indexOf(tag), 1);
        }
        this._updateHtmlCode();
      });
      return elem;
    }

    _createAddAdjacentTagButton(tag, parent) {
      const elem = Tag.createElement(
        'button',
        { type: 'button', class: 'button-add' },
        '+'
      );

      elem.addEventListener('click', () => {
        const newTag =
          parent instanceof PreviewTag
            ? new PreviewTag({ className: 'item' })
            : new PreviewTag({ className: 'container' });
        const siblings = [...parent.elem.children];
        const index = siblings.indexOf(tag.elem);
        if (index === siblings.length - 1) {
          parent.appendChild(newTag);
        } else {
          const nextSibling = siblings[index + 1];
          parent.insertBefore(newTag, nextSibling);
        }
        if (parent instanceof PreviewTag) {
          parent.children.splice(index + 1, 0, newTag);
          newTag.parent = parent;
        } else {
          this._snippets[0].html.splice(index + 1, 0, newTag);
        }
        this._updateHtmlCode();
      });

      return elem;
    }

    _createAddInnerTagButton(tag) {
      const elem = Tag.createElement(
        'button',
        { type: 'button', class: 'button-add' },
        '+'
      );

      // HTML 코드가 하나도 없는 경우
      if (!tag) {
        elem.addEventListener('click', () => {
          const newTag = new PreviewTag({ className: 'container' });
          this._snippets[0].html.push(newTag);
          this._previewWrapper.appendChild(newTag);
          this._updateHtmlCode();
        });
        return elem;
      }

      elem.addEventListener('click', () => {
        const newTag = new PreviewTag({ className: 'item' });
        const { children } = tag;
        tag.text = null;
        if (!children.length) {
          tag.elem.textContent = '';
        }
        tag.insertBefore(newTag, children[0]);
        tag.children.unshift(newTag);
        newTag.parent = tag;
        this._updateHtmlCode();
      });

      return elem;
    }

    _createSelectorDropdown(selectorIndex) {
      const handleClick = (targetItem) => {
        const duplicate = this._curCss.find(
          ({ selector }) => selector.slice(1) === targetItem.textContent
        );
        const curSelector = this._curCss[selectorIndex];
        if (duplicate && duplicate !== curSelector) {
          duplicate.props.push(...curSelector.props);
          this._curCss.splice(this._curCss.indexOf(curSelector), 1);
        }
        curSelector.selector = '.' + targetItem.textContent;
      };
      this._dropdown = this._createDropdown(
        (list) => this._createSelectorDropdownItems()(list),
        handleClick
      );
    }

    _createPropDropdown(selectorIndex, propIndex) {
      const handleClick = (targetItem) => {
        const curSelector = this._curCss[selectorIndex];
        curSelector.props[propIndex].prop = targetItem.textContent;
      };
      this._dropdown = this._createDropdown(
        (list) => this._createPropDropdownItems()(list),
        handleClick
      );
    }

    _createValueDropdown(targetCode, selectorIndex, propIndex) {
      const handleClick = (targetItem) => {
        const curSelector = this._curCss[selectorIndex];
        curSelector.props[propIndex].value = targetItem.textContent;
      };
      this._dropdown = this._createDropdown(
        (list) => this._createValueDropdownItems(targetCode)(list),
        handleClick
      );
    }

    _createSelectorDropdownItems() {
      return (list) => {
        this._classList.forEach((selector) => {
          const item = Tag.createElement('li', {}, selector);
          list.appendChild(item);
        });
      };
    }

    _createPropDropdownItems() {
      return (list) => {
        Editor.CSS_PROPS.forEach((prop) => {
          const item = Tag.createElement('li', {}, prop);
          list.appendChild(item);
        });
      };
    }

    _createValueDropdownItems(targetCode) {
      return (list) => {
        const { selectorIndex, propIndex } = targetCode.dataset;
        const curProp = this._curCss[selectorIndex].props[propIndex].prop;
        Editor.CSS_PROPS_INFO[curProp].forEach((value) => {
          const item = Tag.createElement('li', {}, value);
          list.appendChild(item);
        });
      };
    }

    _createDropdown(createListItems, handleClick) {
      const elem = Tag.createElement('div', { class: 'dropdown' });
      const list = document.createElement('ul');
      createListItems(list);
      elem.appendChild(list);
      elem.addEventListener('click', ({ target }) => {
        if (target.tagName !== 'LI') {
          return;
        }
        handleClick(target);
        this._updateCssCode();
      });
      return elem;
    }

    _createStylesheet(styleText) {
      const stylesheet = styleText
        .replace(/\s+/g, ' ')
        .replace(
          Editor.CSS_STRING,
          (match) => `.fg-editor.editor-${this._editorId} ${match}`
        );
      return stylesheet;
    }

    _createCodeHeader() {
      const header = new Tag({ className: 'header-code' });
      const title = Tag.createElement(
        'p',
        {
          class: 'title'
        },
        this._title
      );
      const htmlButton = Tag.createElement(
        'button',
        {
          type: 'button',
          class: 'button-switch button-left'
        },
        'HTML'
      );
      const cssButton = Tag.createElement(
        'button',
        {
          type: 'button',
          class: 'button-switch button-right is-active'
        },
        'CSS'
      );

      htmlButton.addEventListener('click', () => {
        if (this._curCode === 'HTML') {
          return;
        }
        this._curCode = 'HTML';
        htmlButton.classList.add('is-active');
        cssButton.classList.remove('is-active');
        const table = this._createCssCodeElements();
        this._codeWrapper.removeAllChildren();
        this._codeWrapper.appendChild(table);
      });
      cssButton.addEventListener('click', () => {
        if (this._curCode === 'CSS') {
          return;
        }
        this._curCode = 'CSS';
        htmlButton.classList.remove('is-active');
        cssButton.classList.add('is-active');
        const table = this._createCssCodeElements();
        this._codeWrapper.removeAllChildren();
        this._codeWrapper.appendChild(table);
      });

      header.appendChild([title, htmlButton, cssButton]);
      return header;
    }

    _createHtmlCodeLines(tag, depth = 0) {
      const { elem, children } = tag;
      const { className, textContent } = elem;
      const childrenLines = [];
      children.forEach((child) => {
        childrenLines.push(...this._createHtmlCodeLines(child, depth + 1));
      });
      if (childrenLines.length) {
        return [{ depth, tag, className }, ...childrenLines, { depth, tag }];
      } else {
        return [
          {
            depth,
            className,
            textContent,
            tag
          }
        ];
      }
    }

    _createOpeningTag(tagName, className) {
      const attribute = Tag.createElement(
        'span',
        { class: 'attribute-code' },
        'class='
      );
      const value = Tag.createElement(
        'span',
        { class: 'attribute-value-code' },
        className
      );
      const leftQuotation = Tag.createElement(
        'span',
        { class: 'attribute-code' },
        '"'
      );
      const rightQuotation = Tag.createElement(
        'span',
        { class: 'attribute-code' },
        '"'
      );
      return [
        `<${tagName.toLowerCase()} `,
        attribute,
        leftQuotation,
        value,
        rightQuotation,
        '>'
      ];
    }

    // Event Listener
    // ------------------------------------------------------------------------------

    _codeInputEventListener({ currentTarget, currentTarget: { value } }) {
      if (currentTarget.value.trim() === '') {
        currentTarget.value = '';
      }
      currentTarget.style.width =
        (value.length > 4 ? (value.length + 1) * 9 : 50) + 'px';
    }

    _codeClickEventListener({ target: targetCode }) {
      if (this._isDropdownOpen) {
        this._dropdownParent.removeChild(this._dropdown);
        this._isDropdownOpen = false;

        if (this._dropdownParent === targetCode) {
          this._dropdownParent = null;
          return;
        }
      }

      if (!targetCode.classList.contains('button-code')) {
        return;
      }

      if (targetCode.tagName === 'INPUT') {
        return;
      }

      let scrollTop = 0;
      this._dropdownParent = targetCode;
      const { selectorIndex, propIndex } = targetCode.dataset;
      if (targetCode.classList.contains('selector-code')) {
        this._createSelectorDropdown(selectorIndex);
        scrollTop =
          this._classList.indexOf(targetCode.textContent) *
          Editor.DROPDOWN_HEIGHT;
      }
      if (targetCode.classList.contains('prop-code')) {
        this._createPropDropdown(selectorIndex, propIndex);
        scrollTop =
          Editor.CSS_PROPS.indexOf(targetCode.textContent) *
          Editor.DROPDOWN_HEIGHT;
      }
      if (targetCode.classList.contains('value-code')) {
        this._createValueDropdown(targetCode, selectorIndex, propIndex);
        const prop = this._curCss[selectorIndex].props[propIndex].prop;
        scrollTop =
          Editor.CSS_PROPS_INFO[prop].indexOf(targetCode.textContent) *
          Editor.DROPDOWN_HEIGHT;
      }
      targetCode.appendChild(this._dropdown);
      this._dropdown.scrollTop = scrollTop;
      this._isDropdownOpen = true;
    }

    // snippetList에서 snippet을 변경했을 때 실행
    _snippetChangeEventListener(index) {
      const prevHtml = this._curSnippet.html;
      this._snippetIndex = index;
      const curHtml = this._curSnippet.html;
      this._restoreItemCountVariation();
      this._initCurCss();
      this._updatePreviewDOM(prevHtml, curHtml);
      this._updateCssCode();
      this._updatePreviewTextAndClassName();
    }

    _addItemClickEventListener() {
      const container = this._previewWrapper.querySelector('.container');
      const item = new PreviewTag({ className: 'item' });
      container.appendChild(item.elem);
      this._updateItemCountVariation(container, 1);
      this._updatePreviewTextAndClassName();
      this._updatePreviewStyle();
    }

    _removeItemClickEventListener() {
      const container = this._previewWrapper.querySelector('.container');
      const lastChild = container.lastElementChild;
      if (lastChild) {
        container.removeChild(lastChild);
        this._updateItemCountVariation(container, -1);
        this._updatePreviewTextAndClassName();
        this._updatePreviewStyle();
      }
    }

    _addCodeClickEventListener(selectorIndex) {
      this._curCss.splice(selectorIndex, 0, {
        selector: '.' + '\u00A0'.repeat(8),
        props: [{ prop: '\u00A0'.repeat(4), value: '\u00A0'.repeat(4) }]
      });
      this._updateCssCode();
    }

    _removeCodeClickEventListener(selectorIndex) {
      this._curCss.splice(selectorIndex, 1);
      this._updateCssCode();
    }

    _textTableMousedownEventListener({ target, button, offsetX, offsetY }) {
      if (target.classList.contains('number-line')) {
        return;
      }
      if (button) {
        return;
      }
      this._startX = offsetX;
      this._startY = offsetY;
    }

    _textTableMouseUpEventListener({
      currentTarget,
      target,
      button,
      offsetX,
      offsetY,
      clientY
    }) {
      if (target.classList.contains('number-line')) {
        return;
      }
      if (button) {
        return;
      }

      const diffX = Math.abs(this._startX - offsetX);
      const diffY = Math.abs(this._startY - offsetY);

      if (diffX < 3 && diffY < 3) {
        const letterWidth = Tag.getLetterWidth(
          currentTarget.querySelector('.code-line')
        );
        const { top } = currentTarget.getBoundingClientRect();
        const parentOffsetY = clientY - top;
        const letterX = Math.floor((offsetX - 30) / letterWidth + 0.5);
        const letterY = Math.floor(parentOffsetY / Editor.CODE_HEIGHT);

        const scrollTop = this._codeWrapper.scrollTop;
        this._codeWrapper.removeAllChildren();
        const textareaWrapper = this._createCssCodeTextarea();
        this._codeWrapper.appendChild(textareaWrapper);

        const textarea = textareaWrapper.querySelector('textarea');
        textarea.focus();
        this._codeWrapper.scrollTop = scrollTop;

        const textareaLines = textarea.value.split('\n');
        const letterPos =
          (letterX > textareaLines[letterY].length
            ? textareaLines[letterY].length
            : letterX) +
          textareaLines
            .slice(0, letterY)
            .reduce((acc, v) => acc + v.length + 1, 0);
        textarea.selectionStart = textarea.selectionEnd = letterPos;
      }
    }

    _textTableBlurEventListener() {
      const textarea = this._codeWrapper.querySelector('textarea');
      this._curCss = Editor.parseCssText(textarea.value).map(
        ({ selector, props }) => ({
          selector,
          props: [...props.map((prop) => ({ ...prop }))]
        })
      );
      this._stylesheet = this._createStylesheet(textarea.value);
      this._style.textContent = this._stylesheet;

      this._codeWrapper.removeAllChildren();
      const table = this._createCssCodeTextTable();
      this._codeWrapper.appendChild(table);
    }

    _textAreaInputEventListener({ currentTarget }, numbers) {
      currentTarget.style.height = 'auto';
      currentTarget.style.height = currentTarget.scrollHeight + 'px';
      numbers.removeAllChildren();
      for (
        let i = 0;
        i < currentTarget.scrollHeight / Editor.CODE_HEIGHT;
        i++
      ) {
        const lineNumber = Tag.createElement(
          'span',
          {
            class: 'number-line'
          },
          i + 1
        );
        numbers.appendChild(lineNumber);
      }
    }

    _textTableKeydownEventListener() {
      const selection = window.getSelection();
      if (!selection.toString()) {
        return;
      }
      const { anchorNode, focusNode, anchorOffset, focusOffset } = selection;
      const selectedText = selection.toString().replace(/\n\d+(?=\n)/g, '');

      let anchorLine = anchorNode;
      let focusLine = focusNode;
      while (!anchorLine?.classList?.contains('code-line')) {
        anchorLine = anchorLine.parentElement;
      }
      while (!focusLine?.classList?.contains('code-line')) {
        focusLine = focusLine.parentElement;
      }

      const [node, firstLine, offset] =
        anchorLine.dataset.index === focusLine.dataset.index
          ? anchorOffset < focusOffset
            ? [anchorNode, anchorLine, anchorOffset]
            : [focusNode, focusLine, focusOffset]
          : Number(anchorLine.dataset.index) < Number(focusLine.dataset.index)
          ? [anchorNode, anchorLine, anchorOffset]
          : [focusNode, focusLine, focusOffset];

      const firstLineChildNodes = [...firstLine.childNodes]
        .reduce((acc, node) => [...acc, node, ...(node.childNodes ?? [])], [])
        .filter((node) => node instanceof Text);
      const nodeIndex = firstLineChildNodes.indexOf(node);
      const startIndex =
        firstLineChildNodes.reduce(
          (acc, node, i) =>
            i < nodeIndex ? acc + node.textContent.length : acc,
          0
        ) + offset;

      const scrollTop = this._codeWrapper.scrollTop;
      this._codeWrapper.removeAllChildren();
      const textareaWrapper = this._createCssCodeTextarea();
      this._codeWrapper.appendChild(textareaWrapper);

      const textarea = textareaWrapper.querySelector('textarea');
      textarea.focus();
      this._codeWrapper.scrollTop = scrollTop;

      const textareaLines = textarea.value.split('\n');
      const prevLength = textareaLines
        .slice(0, firstLine.dataset.index)
        .reduce((acc, line) => acc + line.length + 1, 0);

      textarea.selectionStart = textarea.value
        .replaceAll(' ', '\u00A0')
        .indexOf(selectedText, prevLength + startIndex);
      textarea.selectionEnd = textarea.selectionStart + selectedText.length;
    }

    // Update
    // ------------------------------------------------------------------------------

    // 이전 상태와 비교하여 변경된 부분만 수정(transition을 살리기 위함)
    _updatePreviewDOM(prev, cur, curElem = this._previewWrapper.elem) {
      let lengthDiff = prev.length - cur.length;
      while (lengthDiff > 0) {
        curElem.removeChild(curElem.lastElementChild);
        lengthDiff--;
      }
      while (lengthDiff < 0) {
        const container = cur[cur.length + lengthDiff];
        container.render();
        curElem.appendChild(container.elem);
        lengthDiff++;
      }

      const minLength = Math.min(prev.length, cur.length);
      for (let i = 0; i < minLength; i++) {
        if (prev[i].className !== cur[i].className) {
          const prevElem = curElem.children[i];
          cur[i].render();
          curElem.insertBefore(cur[i].elem, prevElem);
          curElem.removeChild(prevElem);
        }
        this._updatePreviewDOM(
          prev[i].children,
          cur[i].children,
          curElem.children[i]
        );
      }
    }

    // preview의 모든 자손 요소들의 style을 초기화 후, _curCss를 기준으로 다시 style 설정
    _updatePreviewStyle() {
      if (this._mode === 'snippet') {
        this._previewWrapper.initAllChildrenStyle();
        const elems = this._previewWrapper.querySelectorAll('*');
        elems.forEach((elem) => {
          const classList = [...elem.classList].map(
            (className) => '.' + className
          );
          const styles = [];
          this._curCss.forEach(({ selector, props }) => {
            if (classList.includes(selector)) {
              styles.push(
                props.map(({ prop, value }) => `${prop}:${value};`).join('')
              );
            }
          });
          elem.style = styles.join('');
        });
      }
    }

    // preview의 모든 item 요소들에 숫자 textContent와 고유한 className 부여
    _updatePreviewTextAndClassName() {
      const items = this._previewWrapper.querySelectorAll('.item');
      items.forEach((item, index) => {
        item.classList.add(`item${index + 1}`);
        if (!item.children.length) {
          item.textContent = index + 1;
        }
      });
      const containers = this._previewWrapper.querySelectorAll('.container');
      containers.forEach((container, index) => {
        container.classList.add(`container${index + 1}`);
      });
    }

    // code 안에 table을 통째로 교체
    // _cssTable은 _curCss를 기준으로 생성됨
    _updateCssCode() {
      this._curCss.forEach(({ props }, index) => {
        if (!props.length) {
          this._curCss.splice(index, 1);
        }
      });
      const table = this._createCssCodeElements();
      this._codeWrapper.removeAllChildren();
      this._codeWrapper.appendChild(table);
      this._updatePreviewStyle();
    }

    _updateItemCountVariation(container, variation) {
      const value = this._itemCountVariation.get(container);
      if (value) {
        this._itemCountVariation.set(container, value + variation);
      } else {
        this._itemCountVariation.set(container, variation);
      }
    }

    _updateHtml(
      tag,
      counts = {
        item: 1,
        container: 1
      }
    ) {
      if (!(tag instanceof PreviewTag)) {
        tag.forEach((container) => this._updateHtml(container, counts));
      } else {
        const classList = [];

        if (tag.parent) {
          classList.push('item');
        }

        if (tag.children.length || !tag.parent) {
          classList.push('container', `container${counts.container++}`);
        } else {
          if (tag.text === null) {
            tag.elem.textContent = counts.item;
          } else {
            tag.elem.textContent = tag.text;
          }
          classList.push(`item${counts.item++}`);
        }

        tag.elem.className = classList.join(' ');
        tag.children.forEach((child) => {
          this._updateHtml(child, counts);
        });
      }
    }

    _updateHtmlCode() {
      this._updateHtml(this._snippets[0].html);
      const table = this._createCssCodeElements();
      this._codeWrapper.removeAllChildren();
      this._codeWrapper.appendChild(table);
    }

    // 현재 snippet과 비교하여 add item, remove item을 하여 변동된 item 개수를 복원함
    // snippet 변경시 이전 snippet에서 현재 snippet과 비교하기 전에
    // 이전 snippet의 원래 상태로 복원하기 위함
    _restoreItemCountVariation() {
      for (const [container] of this._itemCountVariation) {
        while (this._itemCountVariation.get(container) > 0) {
          container.removeChild(container.lastElementChild);
          this._updateItemCountVariation(container, -1);
        }
        while (this._itemCountVariation.get(container) < 0) {
          container.appendChild(new PreviewTag({ className: 'item' }).elem);
          this._updateItemCountVariation(container, 1);
        }
      }
    }

    _updateSelectorCodeLineStyle(line, codeLine) {
      const selectorSpan = Tag.createElement(
        'span',
        {
          class: 'selector-code'
        },
        line.slice(1)
      );
      Tag.appendChildren(codeLine, ['.', selectorSpan, '\u00A0{']);
    }

    _updatePropCodeLineStyle(line, codeLine) {
      const [prop, value] = line.split(':');
      const propSpan = Tag.createElement(
        'span',
        {
          class: 'prop-code'
        },
        prop
      );
      const valueElem = Tag.createElement(
        'span',
        {
          class: 'value-code'
        },
        value
      );

      Tag.appendChildren(codeLine, [
        '\u00A0\u00A0',
        propSpan,
        ':\u00A0',
        valueElem,
        ';'
      ]);
    }

    // _editor에 children을 순서대로 append
    _appendToEditor(children) {
      const fragment = document.createDocumentFragment();
      children.forEach((child) => fragment.appendChild(child.elem));
      this._editor.appendChild(fragment);
    }

    render() {
      this._editor.removeAllChildren();
      if (this._mode === 'snippet') {
        this._appendToEditor([
          this._snippetList,
          this._preview,
          this._code,
          this._buttons
        ]);
        this._updatePreviewTextAndClassName();
      } else if (this._mode === 'free') {
        this._appendToEditor([this._preview, this._code]);
        this._updateHtml(this._curSnippet.html);
      }
      this._updatePreviewStyle();
      console.log(this);
    }
  }

  const findEditors = () => {
    return [...document.querySelectorAll('.fg-editor')];
  };

  findEditors().forEach((editor, index) => new Editor(editor, index).render());
})();
