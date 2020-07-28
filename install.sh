#...

DOTPATH=~/dotfiles
# chmod 774 ./lndir.sh

for f in .??*; do
    [ "$f" = ".git" ] && continue

    ln -snfv "$DOTPATH/$f" "$HOME/$f"
done
