# Setup

The dotfiles directory should be placed under the home directory.

```sh
chmod +x dotfiles/install.sh
cd ~/dotfiles
# If you put `dotfiles` outside of $HOME, edit the $DOTPATH in `install.sh`.
./install.sh # don't execute as root (sudo)
```

Once oh-my-zsh is installed, the zsh shell will be newly started, and you should exit once.

<img width="796" alt="zsh_exit" src="https://github.com/mtshiba/dotfiles/assets/45118249/55aa7c14-7d8e-428e-a8b2-ebc6a2bfd761">

Oh-my-zsh may replace .zshrc with .zshrc.pre-oh-my-zsh. Fix it.

```sh
rm ~/.zshrc
mv ~/.zshrc.pre-oh-my-zsh ~/.zshrc
```

## Font

* powerlevel10k uses Nerd font. I recommend 'Meslo Nerd Font'. Run the following command and install it.

``` sh
curl -fLo "MesloNerdFont.ttf" https://github.com/ryanoasis/nerd-fonts/raw/master/patched-fonts/Meslo/M/Regular/MesloLGMNerdFontMono-Regular.ttf
```
