BINARY=${BINARY:-create-ekko-app}
GOBIN=$(go env GOBIN)
[ -z "$GOBIN" ] && GOBIN=$(go env GOPATH)/bin

rm -f "$GOBIN/$BINARY"
