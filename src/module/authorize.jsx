console.log( "===== simpread option labs:Authorize load =====" )

import {storage} from 'storage';
import * as exp  from 'export';
import * as msg  from 'message';
import {browser} from 'browser';

import Notify    from 'notify';
import Switch    from 'switch';
import TextField from 'textfield';
import Button    from 'button';

export default class Auth extends React.Component {

    static defaultProps = {
        linnk: {
            username: "",
            password: "",
        },
        instapaper: {
            username: "",
            password: "",
        }
    }

    state = {
        secret : undefined,
        linnk  : undefined,
        instapaper : undefined,
    }

    onChange( state, value, flag ) {
        const { dropbox, pocket, instapaper, linnk, evernote, onenote, gdrive } = exp,
            clear = ( id, name ) => {
                Object.keys( storage.secret[id] ).forEach( item => storage.secret[id][item] = "" );
                storage.Safe( ()=> {
                    new Notify().Render( `已取消对 ${name} 的授权，也请解除简悦的访问权限， <a target="_blank" href="${exp.Unlink(id)}">点击这里</a>` );
                    this.setState({ secret: storage.secret });
                }, storage.secret );
            },
            success = ( id, name, data ) => {
                Object.keys( data ).forEach( item => storage.secret[id][item] = data[item] );
                storage.Safe( () => {
                    new Notify().Render( `已成功授权 ${name} 。` );
                    id == "linnk"      && this.setState({ secret: storage.secret, linnk: false });
                    id == "instapaper" && this.setState({ secret: storage.secret, instapaper: false });
                    if ( location.hash.startsWith( "#labs?auth=" ) ) {
                        new Notify().Render( "3 秒钟将会关闭此页面..." );
                        setTimeout( () => {
                            browser.runtime.sendMessage( msg.Add( msg.MESSAGE_ACTION.auth_success, { url: location.href, type: "auth", name: id } ));
                        }, 3000 )
                    }
                }, storage.secret );
            },
            failed = ( error, id, name ) => {
                console.error( `${name} auth faild, error: ${error}` )
                new Notify().Render( 2, `获取 ${name} 授权失败，请重新获取。` );
                storage.secret[state].access_token = "";
                this.setState({ secret: storage.secret });
            };

        if ( state == "linnk" && !flag && !storage.secret.linnk.access_token ) {
            this.setState({ linnk: !this.state.linnk });
            return;
        }

        if ( state == "instapaper" && !flag && !storage.secret.instapaper.access_token ) {
            this.setState({ instapaper: !this.state.instapaper });
            return;
        }

        if ( !value ) {
            state == "pocket" && $( this.refs.pocket_tags ).velocity( value ? "slideDown" : "slideUp" );
            if ( state == "linnk" ) {
                this.props.linnk.username = "";
                this.props.linnk.password = "";
            }
            if ( state == "instapaper" ) {
                this.props.instapaper.username = "";
                this.props.instapaper.password = "";
            }
            clear( state, exp.Name( state ));
            return;
        }

        new Notify().Render({ content: "授权中，请勿关闭此页面，授权成功后会有提示。", delay: 10000 } );

        switch ( state ) {
            case "dropbox":
                dropbox.New().Auth();
                dropbox.dtd
                    .done( ()    => success( dropbox.id, dropbox.name, { access_token: dropbox.access_token } ))
                    .fail( error => failed( error, dropbox.id, dropbox.name ));
                break;
            case "pocket":
                new Notify().Render( `开始对 ${ pocket.name } 进行授权，请稍等...` );
                pocket.Request( ( result, error ) => {
                    if ( error ) failed( error, pocket.id, pocket.name );
                    else {
                        pocket.New().Login( result.code );
                        pocket.dtd.done( ()=> {
                            pocket.Auth( ( result, error ) => {
                                if ( error ) failed( error, pocket.id, pocket.name );
                                else success( pocket.id, pocket.name, { access_token: pocket.access_token });
                            });
                        }).fail( error => failed( error, pocket.id, pocket.name ));
                    }
                });
                break;
            case "instapaper":
                instapaper.Login( this.props.instapaper.username, this.props.instapaper.password, ( result, error ) => {
                    if ( error ) failed( error, instapaper.id, instapaper.name );
                    else success( instapaper.id, instapaper.name, { access_token: instapaper.access_token, token_secret: instapaper.token_secret });
                });
                break;
            case "linnk":
                linnk.Login( this.props.linnk.username, this.props.linnk.password, ( result, error ) => {
                    if ( error ) failed( error, linnk.id, linnk.name );
                    else if ( result.code == 200 ) {
                        linnk.Groups( result => {
                            if ( result.code == 200 ) {
                                linnk.GetGroup( "", result.data );
                                success( linnk.id, linnk.name, { access_token: linnk.access_token, group_name: linnk.group_name });
                            } else {
                                const msg = linnk.error_code[result.code];
                                new Notify().Render( 2, msg ? msg : `获取 ${ linnk.name } 授权失败，请重新获取。` );
                            }
                        });
                    } else {
                        const msg = linnk.error_code[result.code];
                        new Notify().Render( 2, msg ? msg : `获取 ${ linnk.name } 授权失败，请重新获取。` );
                    }
                });
                break;
            case "yinxiang":
            case "evernote":
                evernote.env     = state;
                evernote.sandbox = false;
                new Notify().Render( `开始对 ${ evernote.name } 进行授权，请稍等...` );
                evernote.New().RequestToken( ( result, error ) => {
                    if ( error ) failed( error, evernote.id, evernote.name );
                    else {
                        evernote.dtd.done( () => {
                            evernote.Auth( ( result, error ) => {
                                if ( error ) failed( error, evernote.id, evernote.name );
                                else success( evernote.id, evernote.name, { access_token: evernote.access_token });
                            });
                        }).fail( error => failed( error, evernote.id, evernote.name ));
                    }
                });
                break;
            case "onenote":
                onenote.New().Login();
                onenote.dtd.done( ()=> {
                    onenote.Auth( ( result, error ) => {
                        if ( error ) failed( error, onenote.id, onenote.name );
                        else success( onenote.id, onenote.name, { access_token: onenote.access_token });
                    });
                }).fail( error => failed( error, onenote.id, onenote.name ));
                break;
            case "gdrive":
                gdrive.New().Login();
                gdrive.dtd.done( ()=> {
                    gdrive.Auth( ( result, error ) => {
                        if ( error ) failed( error, gdrive.id, gdrive.name );
                        else success( gdrive.id, gdrive.name, { access_token: gdrive.access_token, folder_id: gdrive.folder_id });
                    });
                }).fail( error => failed( error, gdrive.id, gdrive.name ));
                break;
        }
    }

    save( state, value ) {
        state == "pocket" && ( storage.secret.pocket.tags      = value.trim() );
        state == "linnk"  && ( storage.secret.linnk.group_name = value.trim() );
        storage.Safe( () => this.setState({ secret: storage.secret }), storage.secret );
    }

    linnkOnChange( state, value ) {
        this.props.linnk[state] = value;
    }

    instapaperOnChange( state, value ) {
        this.props.instapaper[state] = value;
    }

    componentWillReceiveProps( nextProps ) {
        this.setState({ secret: storage.secret })
    }

    componentDidMount() {
        storage.Safe( () => this.setState({ secret: storage.secret }) );
        if ( location.hash.startsWith( "#labs?auth=" ) ) {
            this.onChange( location.hash.replace( "#labs?auth=", "" ), true );
        }
    }

    render() {

        let auth;

        if ( this.state.secret ) {

            auth = <div>
                        <Switch width="100%" checked={ this.state.secret.dropbox.access_token != "" ? true : false }
                            thumbedColor="#3F51B5" trackedColor="#7986CB" waves="md-waves-effect"
                            label={ this.state.secret.dropbox.access_token ? "已授权 Dropbox，是否取消授权？" : "是否连接并授权 Dropbox ？" }
                            onChange={ (s)=>this.onChange( "dropbox", s ) } />

                        <Switch width="100%" checked={ this.state.secret.pocket.access_token != "" ? true : false }
                            thumbedColor="#3F51B5" trackedColor="#7986CB" waves="md-waves-effect"
                            label={ this.state.secret.pocket.access_token ? "已授权 Pocket，是否取消授权？" : "是否连接并授权 Pocket ？" }
                            onChange={ (s)=>this.onChange( "pocket", s ) } />

                        { this.state.secret.pocket.access_token && 
                        <div ref="pocket_tags" style={{ "width": "60%" }}>
                            <TextField
                                placeholder="请填入 Pocket 标签，默认为 simpread 每个标签用小写, 分割。" 
                                value={ this.state.secret.pocket.tags }
                                onChange={ (evt)=>this.save( "pocket", evt.target.value ) }
                            />
                        </div> }

                        <Switch width="100%" checked={ this.state.secret.instapaper.access_token != "" ? true : false }
                            thumbedColor="#3F51B5" trackedColor="#7986CB" waves="md-waves-effect"
                            label={ this.state.secret.instapaper.access_token ? "已授权 Instapaper，是否取消授权？" : "是否连接并授权 Instapaper ？" }
                            onChange={ (s)=>this.onChange( "instapaper", s ) } />

                        { this.state.instapaper && 
                        <div ref="instapaper">
                            <div style={{ "display": "flex", "flex-direction": "row" }}>
                                <TextField
                                    placeholder="请填入 Instapaper 用户名，简悦不会记录你的用户名。" 
                                    onChange={ (evt)=>this.instapaperOnChange( "username", evt.target.value ) }
                                />
                                <TextField
                                    password={true}
                                    placeholder="请填入 Instapaper 密码，简悦不会记录你的密码。" 
                                    onChange={ (evt)=>this.instapaperOnChange( "password", evt.target.value ) }
                                />
                            </div>

                            <Button type="raised" width="100%" style={{ "margin": "0" }}
                                text="登录 Instapaper 并授权"
                                color="#fff" backgroundColor="#3F51B5"
                                waves="md-waves-effect md-waves-button"
                                onClick={ (s)=>this.onChange( "instapaper", s, "login" ) } />
                        </div> }

                        <Switch width="100%" checked={ this.state.secret.linnk.access_token != "" ? true : false }
                            thumbedColor="#3F51B5" trackedColor="#7986CB" waves="md-waves-effect"
                            label={ this.state.secret.linnk.access_token ? "已授权 Linnk，是否取消授权？" : "是否连接并授权 Linnk ？" }
                            onChange={ (s)=>this.onChange( "linnk", s ) } />

                        { this.state.secret.linnk.access_token && 
                            <div style={{ "width": "60%" }}>
                                <TextField
                                    value={ this.state.secret.linnk.group_name }
                                    placeholder="请填入 Linnk 收藏夹名称，默认保存到 收件箱。" 
                                    onChange={ (evt)=>this.save( "linnk", evt.target.value ) }
                                />
                            </div> }

                        { this.state.linnk && 
                        <div ref="linnk">
                            <div style={{ "display": "flex", "flex-direction": "row" }}>
                                <TextField
                                    placeholder="请填入 Linnk 用户名，简悦不会记录你的用户名。" 
                                    onChange={ (evt)=>this.linnkOnChange( "username", evt.target.value ) }
                                />
                                <TextField
                                    password={true}
                                    placeholder="请填入 Linnk 密码，简悦不会记录你的密码。" 
                                    onChange={ (evt)=>this.linnkOnChange( "password", evt.target.value ) }
                                />
                            </div>

                            <Button type="raised" width="100%" style={{ "margin": "0" }}
                                text="登录 Linnk 并授权"
                                color="#fff" backgroundColor="#3F51B5"
                                waves="md-waves-effect md-waves-button"
                                onClick={ (s)=>this.onChange( "linnk", s, "login" ) } />
                        </div> }

                        <Switch width="100%" checked={ this.state.secret.yinxiang.access_token != "" ? true : false }
                            thumbedColor="#3F51B5" trackedColor="#7986CB" waves="md-waves-effect"
                            label={ this.state.secret.yinxiang.access_token ? "已授权 印象笔记，是否取消授权？" : "是否连接并授权 印象笔记 ？" }
                            onChange={ (s)=>this.onChange( "yinxiang", s ) } />

                        <Switch width="100%" checked={ this.state.secret.evernote.access_token != "" ? true : false }
                            thumbedColor="#3F51B5" trackedColor="#7986CB" waves="md-waves-effect"
                            label={ this.state.secret.evernote.access_token ? "已授权 Evernote，是否取消授权？" : "是否连接并授权 Evernote ？" }
                            onChange={ (s)=>this.onChange( "evernote", s ) } />

                        <Switch width="100%" checked={ this.state.secret.onenote.access_token != "" ? true : false }
                            thumbedColor="#3F51B5" trackedColor="#7986CB" waves="md-waves-effect"
                            label={ this.state.secret.onenote.access_token ? "已授权 Onenote，是否取消授权？" : "是否连接并授权 Onenote ？" }
                            onChange={ (s)=>this.onChange( "onenote", s ) } />

                        <Switch width="100%" checked={ this.state.secret.gdrive.access_token != "" ? true : false }
                            thumbedColor="#3F51B5" trackedColor="#7986CB" waves="md-waves-effect"
                            label={ this.state.secret.gdrive.access_token ? "已授权 Google 云端硬盘，是否取消授权？" : "是否连接并授权 Google 云端硬盘 ？" }
                            onChange={ (s)=>this.onChange( "gdrive", s ) } />

                    </div>;
        }

        return (
            <div>{ auth }</div>
        )
    }

}