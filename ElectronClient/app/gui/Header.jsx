const React = require('react');
const { connect } = require('react-redux');
const { reg } = require('lib/registry.js');
const { themeStyle } = require('../theme.js');
const { _ } = require('lib/locale.js');
const { bridge } = require('electron').remote.require('./bridge');

class HeaderComponent extends React.Component {

	constructor() {
		super();
		this.state = {
			searchQuery: '',
			showSearchUsageLink: false,
		};

		this.scheduleSearchChangeEventIid_ = null;
		this.searchOnQuery_ = null;
		this.searchElement_ = null;

		const triggerOnQuery = (query) => {
			clearTimeout(this.scheduleSearchChangeEventIid_);
			if (this.searchOnQuery_) this.searchOnQuery_(query);
			this.scheduleSearchChangeEventIid_ = null;
		}

		this.search_onChange = (event) => {
			this.setState({ searchQuery: event.target.value });

			if (this.scheduleSearchChangeEventIid_) clearTimeout(this.scheduleSearchChangeEventIid_);

			this.scheduleSearchChangeEventIid_ = setTimeout(() => {
				triggerOnQuery(this.state.searchQuery);
			}, 500);
		};

		this.search_onClear = (event) => {
			this.resetSearch();
			if (this.searchElement_) this.searchElement_.focus();
		}

		this.search_onFocus = event => {
			if (this.hideSearchUsageLinkIID_) {
				clearTimeout(this.hideSearchUsageLinkIID_);
				this.hideSearchUsageLinkIID_ = null;
			}

			this.setState({ showSearchUsageLink: true });
		}

		this.search_onBlur = event => {
			if (this.hideSearchUsageLinkIID_) return;

			this.hideSearchUsageLinkIID_ = setTimeout(() => {
				this.setState({ showSearchUsageLink: false });
			}, 5000);
		}
		
		this.search_keyDown = event => {
			if (event.keyCode === 27) { // ESCAPE
				this.resetSearch();
			}
		}
		
		this.resetSearch = () => {
			this.setState({ searchQuery: '' });
			triggerOnQuery('');
		}

		this.searchUsageLink_click = event => {
			bridge().openExternal('https://joplinapp.org/#searching');
		}
	}

	async componentWillReceiveProps(nextProps) {
		if (nextProps.windowCommand) {
			this.doCommand(nextProps.windowCommand);
		}
	}

	componentDidUpdate(prevProps) {
		if(prevProps.notesParentType !== this.props.notesParentType && this.props.notesParentType !== 'Search' && this.state.searchQuery) {
			this.resetSearch();
		}
	}
	
	componentWillUnmount() {
		if (this.hideSearchUsageLinkIID_) {
			clearTimeout(this.hideSearchUsageLinkIID_);
			this.hideSearchUsageLinkIID_ = null;
		}
	}

	async doCommand(command) {
		if (!command) return;

		let commandProcessed = true;

		if (command.name === 'focusSearch' && this.searchElement_) {
			this.searchElement_.focus();
		} else {
			commandProcessed = false;
		}

		if (commandProcessed) {
			this.props.dispatch({
				type: 'WINDOW_COMMAND',
				name: null,
			});
		}
	}

	back_click() {
		this.props.dispatch({ type: 'NAV_BACK' });
	}

	makeButton(key, style, options) {
		let icon = null;
		if (options.iconName) {
			const iconStyle = {
				fontSize: Math.round(style.fontSize * 1.1),
				color: style.color,
			};
			if (options.title) iconStyle.marginRight = 5;
			if("undefined" != typeof(options.iconRotation)) {
				iconStyle.transition = "transform 0.15s ease-in-out";
				iconStyle.transform = 'rotate(' + options.iconRotation + 'deg)';
			}
			icon = <i style={iconStyle} className={"fa " + options.iconName}></i>
		}

		const isEnabled = (!('enabled' in options) || options.enabled);
		let classes = ['button'];
		if (!isEnabled) classes.push('disabled');

		const finalStyle = Object.assign({}, style, {
			opacity: isEnabled ? 1 : 0.4,
		});

		const title = options.title ? options.title : '';

		return <a
			className={classes.join(' ')}
			style={finalStyle}
			key={key}
			href="#"
			title={title}
			onClick={() => { if (isEnabled) options.onClick() }}
		>
			{icon}<span className="title">{title}</span>
		</a>
	}

	makeSearch(key, style, options, state) {
		const theme = themeStyle(this.props.theme);

		const inputStyle = {
			display: 'flex',
			flex: 1,
			paddingLeft: 6,
			paddingRight: 6,
			paddingTop: 1,  // vertical alignment with buttons
			paddingBottom: 0,  // vertical alignment with buttons
			height: style.fontSize * 2,
			color: style.color,
			fontSize: style.fontSize,
			fontFamily: style.fontFamily,
			backgroundColor: style.searchColor,
			border: '1px solid',
			borderColor: style.dividerColor,
		};

		const searchButton = {
			paddingLeft: 4,
			paddingRight: 4,
			paddingTop: 2,
			paddingBottom: 2,
			textDecoration: 'none',
		};

		const iconStyle = {
			display: 'flex',
			fontSize: Math.round(style.fontSize) * 1.2,
			color: style.color,
		};

		const containerStyle = {
			display: 'flex',
			flexDirection: 'row',
			alignItems: 'center',
		};

		const iconName = state.searchQuery ? 'fa-times' : 'fa-search';
		const icon = <i style={iconStyle} className={"fa " + iconName}></i>
		if (options.onQuery) this.searchOnQuery_ = options.onQuery;

		const usageLink = !this.state.showSearchUsageLink ? null : (
			<a onClick={this.searchUsageLink_click} style={theme.urlStyle} href="#">{_('Usage')}</a>
		);

		return (
			<div key={key} style={containerStyle}>
				<input
					type="text"
					style={inputStyle}
					placeholder={options.title}
					value={state.searchQuery}
					onChange={this.search_onChange}
					ref={elem => this.searchElement_ = elem}
					onFocus={this.search_onFocus}
					onBlur={this.search_onBlur}
					onKeyDown={this.search_keyDown}
				/>
				<a
					href="#"
					style={searchButton}
					onClick={this.search_onClear}
				>{icon}</a>
				{usageLink}
			</div>);
	}

	render() {
		const style = Object.assign({}, this.props.style);
		const theme = themeStyle(this.props.theme);
		const showBackButton = this.props.showBackButton === undefined || this.props.showBackButton === true;
		style.height = theme.headerHeight;
		style.display = 'flex';
		style.flexDirection  = 'row';
		style.borderBottom = '1px solid ' + theme.dividerColor;
		style.boxSizing = 'border-box';

		const items = [];

		const itemStyle = {
			height: theme.headerHeight,
			display: 'flex',
			alignItems: 'center',
			paddingLeft: theme.headerButtonHPadding,
			paddingRight: theme.headerButtonHPadding,
			color: theme.color,
			searchColor: theme.backgroundColor,
			dividerColor: theme.dividerColor,
			textDecoration: 'none',
			fontFamily: theme.fontFamily,
			fontSize: theme.fontSize,
			boxSizing: 'border-box',
			cursor: 'default',
		};

		if (showBackButton) {
			items.push(this.makeButton('back', itemStyle, { title: _('Back'), onClick: () => this.back_click(), iconName: 'fa-chevron-left ' }));
		}

		if (this.props.items) {
			for (let i = 0; i < this.props.items.length; i++) {
				const item = this.props.items[i];

				if (item.type === 'search') {
					items.push(this.makeSearch('item_' + i + '_search', itemStyle, item, this.state));
				} else {
					items.push(this.makeButton('item_' + i + '_' + item.title, itemStyle, item));
				}
			}
		}

		return (
			<div className="header" style={style}>
				{ items }
			</div>
		);
	}

}

const mapStateToProps = (state) => {
	return {
		theme: state.settings.theme,
		windowCommand: state.windowCommand,
		notesParentType: state.notesParentType,
	};
};

const Header = connect(mapStateToProps)(HeaderComponent);

module.exports = { Header };
